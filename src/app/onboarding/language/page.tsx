import { ResponseLanguageForm } from "@/features/onboarding/components/response-language-form";
import { onboardingService } from "@/features/onboarding/services/onboarding.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function ResponseLanguagePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const state = await onboardingService.getOnboardingState(workspace.id);

  return <ResponseLanguageForm defaultValues={{ language: state.agent?.language ?? "en" }} />;
}
