"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { createBusinessInfoSchema } from "../validation/schemas";
import { onboardingService } from "../services/onboarding.service";

export async function saveBusinessInfoAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("validation");
  const parsed = createBusinessInfoSchema(t).safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await onboardingService.saveBusinessInfo(workspace.id, parsed.data);

    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, parsed.data.language, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
