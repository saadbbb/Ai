"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authService } from "../services/auth.service";
import { userRepository } from "../repository/user.repository";
import { createLoginSchema } from "../validation/schemas";

export async function loginAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createLoginSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    await authService.login(parsed.data.email, parsed.data.password);

    // Best-effort — if the local profile hasn't been synced yet, requireUser()
    // on the very next request (the dashboard redirect) creates it regardless.
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    const user = supabaseUser ? await userRepository.findById(supabaseUser.id) : null;
    if (user) {
      const workspace = await workspaceService.getPrimaryWorkspaceForUser(user.id);
      if (workspace) {
        const cookieStore = await cookies();
        cookieStore.set(LOCALE_COOKIE_NAME, workspace.language, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });

        // Best-effort, same reasoning as the cookie/profile sync above — a logging
        // failure must never turn an otherwise-successful login into an error.
        try {
          await workspaceAuditLogRepository.log({
            workspaceId: workspace.id,
            actorUserId: user.id,
            actorEmail: user.email,
            action: "login",
            targetType: "session",
            summary: `${user.email} logged in.`,
          });
        } catch (error) {
          console.error("[login] failed to write audit log:", error);
        }
      }
    }

    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
