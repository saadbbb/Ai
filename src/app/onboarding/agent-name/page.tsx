import { AgentNameForm } from "@/features/onboarding/components/agent-name-form";
import { onboardingService } from "@/features/onboarding/services/onboarding.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function AgentNamePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const state = await onboardingService.getOnboardingState(workspace.id);

  return <AgentNameForm defaultValues={{ name: state.agent?.name ?? "" }} />;
}
