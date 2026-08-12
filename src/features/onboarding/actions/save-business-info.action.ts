"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { isLocale, LOCALE_COOKIE_NAME } from "@/i18n/config";
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
    // The dashboard-language step was removed from onboarding — the top-right
    // locale switcher (already used pre-signup) is the single source of truth now.
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    const language = localeCookie && isLocale(localeCookie) ? localeCookie : "ar";

    await onboardingService.saveBusinessInfo(workspace.id, workspace, { name: parsed.data.name, language });
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
