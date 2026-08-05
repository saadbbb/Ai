import { getTranslations } from "next-intl/server";
import { FaqManager } from "@/features/knowledge-base/components/faq-manager";
import { PolicySettingsForm } from "@/features/knowledge-base/components/policy-settings-form";
import { ProductManager } from "@/features/knowledge-base/components/product-manager";
import { ServiceManager } from "@/features/knowledge-base/components/service-manager";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";
import { policyRepository } from "@/features/knowledge-base/repository/policy.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function KnowledgeBasePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "knowledge_base");
  const t = await getTranslations("knowledgeBasePage");

  const [faqs, products, services, policy] = await Promise.all([
    faqRepository.findByWorkspaceId(workspace.id),
    productRepository.findByWorkspaceId(workspace.id),
    serviceRepository.findByWorkspaceId(workspace.id),
    policyRepository.findByWorkspaceId(workspace.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>

      <FaqManager initialFaqs={faqs} />
      <ProductManager initialProducts={products} />
      <ServiceManager initialServices={services} />
      <PolicySettingsForm
        defaultValues={{
          shippingPolicy: policy?.shippingPolicy ?? "",
          returnsPolicy: policy?.returnsPolicy ?? "",
          paymentsPolicy: policy?.paymentsPolicy ?? "",
        }}
      />
    </div>
  );
}
