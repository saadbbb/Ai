import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { FaqManager } from "@/features/knowledge-base/components/faq-manager";
import { PolicySettingsForm } from "@/features/knowledge-base/components/policy-settings-form";
import { ServiceManager } from "@/features/knowledge-base/components/service-manager";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";
import { policyRepository } from "@/features/knowledge-base/repository/policy.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function KnowledgeBasePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "knowledge_base");
  const t = await getTranslations("knowledgeBasePage");

  const [faqs, services, policy] = await Promise.all([
    faqRepository.findByWorkspaceId(workspace.id),
    serviceRepository.findByWorkspaceId(workspace.id),
    policyRepository.findByWorkspaceId(workspace.id),
  ]);

  return (
    <PageContainer>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <FaqManager initialFaqs={faqs} />
      <ServiceManager initialServices={services} />
      <PolicySettingsForm
        defaultValues={{
          shippingPolicy: policy?.shippingPolicy ?? "",
          returnsPolicy: policy?.returnsPolicy ?? "",
          paymentsPolicy: policy?.paymentsPolicy ?? "",
        }}
      />
    </PageContainer>
  );
}
