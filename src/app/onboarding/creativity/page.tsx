import { CreativityForm } from "@/features/onboarding/components/creativity-form";
import { onboardingService } from "@/features/onboarding/services/onboarding.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function CreativityPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const state = await onboardingService.getOnboardingState(workspace.id);

  return <CreativityForm defaultValues={{ creativity: state.agent?.creativity ?? "medium" }} />;
}
