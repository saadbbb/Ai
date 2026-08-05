"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";
import { getRequestContext } from "@/lib/auth/request-context";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { authService } from "../services/auth.service";
import { createLoginSchema } from "../validation/schemas";

export async function loginAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createLoginSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const context = await getRequestContext();
    const user = await authService.login(parsed.data.email, parsed.data.password, {
      ...context,
      rememberMe: parsed.data.rememberMe,
    });

    const workspace = await workspaceService.getPrimaryWorkspaceForUser(user.id);
    if (workspace) {
      const cookieStore = await cookies();
      cookieStore.set(LOCALE_COOKIE_NAME, workspace.language, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }

    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
