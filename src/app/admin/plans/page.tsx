import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { PlanManager } from "@/features/platform-admin/components/plan-manager";
import { planRepository } from "@/features/platform-admin/repository/plan.repository";

export default async function AdminPlansPage() {
  const t = await getTranslations("platformAdmin.plans");
  const plans = await planRepository.findAll();

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />
      <PlanManager initialPlans={plans} />
    </PageContainer>
  );
}
