"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeIraqiPhone } from "../lib/phone";
import { userRepository } from "../repository/user.repository";
import { authService } from "../services/auth.service";
import { createPhoneLoginSchema } from "../validation/schemas";

export async function loginWithPhoneAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createPhoneLoginSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const phone = normalizeIraqiPhone(parsed.data.phone);
  if (!phone) {
    return actionValidationError(t("phoneInvalid"));
  }

  try {
    await authService.loginWithPhone(phone, parsed.data.password);

    // Best-effort — same reasoning as login.action.ts's email path.
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

        try {
          await workspaceAuditLogRepository.log({
            workspaceId: workspace.id,
            actorUserId: user.id,
            actorEmail: user.name ?? user.phone ?? "Unknown",
            action: "login",
            targetType: "session",
            summary: `${user.name ?? user.phone} logged in.`,
          });
        } catch (error) {
          console.error("[login-with-phone] failed to write audit log:", error);
        }
      }
    }

    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
