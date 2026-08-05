import { KnowledgeBaseForm } from "@/features/onboarding/components/knowledge-base-form";
import { onboardingService } from "@/features/onboarding/services/onboarding.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function KnowledgeBasePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const state = await onboardingService.getOnboardingState(workspace.id);

  return (
    <KnowledgeBaseForm
      existing={{
        faqs: state.faqs,
        products: state.products,
        services: state.services,
        policy: state.policy,
      }}
    />
  );
}
