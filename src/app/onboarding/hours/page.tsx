import { DEFAULT_WORKING_HOURS } from "@/features/ai/constants";
import { WorkingHoursForm } from "@/features/onboarding/components/working-hours-form";
import { onboardingService } from "@/features/onboarding/services/onboarding.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function WorkingHoursPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const state = await onboardingService.getOnboardingState(workspace.id);

  return <WorkingHoursForm defaultValues={state.agent?.workingHours ?? DEFAULT_WORKING_HOURS} />;
}
