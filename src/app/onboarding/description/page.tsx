import { BusinessDescriptionForm } from "@/features/onboarding/components/business-description-form";
import { onboardingService } from "@/features/onboarding/services/onboarding.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function BusinessDescriptionPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const state = await onboardingService.getOnboardingState(workspace.id);

  return <BusinessDescriptionForm defaultValues={{ businessDescription: state.agent?.businessDescription ?? "" }} />;
}
