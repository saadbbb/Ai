import { HandoverForm } from "@/features/onboarding/components/handover-form";
import { onboardingService } from "@/features/onboarding/services/onboarding.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function HandoverPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const state = await onboardingService.getOnboardingState(workspace.id);

  return (
    <HandoverForm
      defaultValues={{
        handoverEnabled: state.agent?.handoverEnabled ?? false,
        handoverInstructions: state.agent?.handoverInstructions ?? "",
      }}
    />
  );
}
