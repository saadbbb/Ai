import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { CampaignManager } from "@/features/campaigns/components/campaign-manager";
import { ChurnRiskList } from "@/features/campaigns/components/churn-risk-list";
import { campaignService } from "@/features/campaigns/services/campaign.service";
import { messageTemplateRepository } from "@/features/inbox/repository/message-template.repository";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function CampaignsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "campaigns");
  await requireWorkspacePermission(user.id, workspace.id, "campaigns.manage");
  const t = await getTranslations("campaigns");

  const [campaigns, churnRisk, templates] = await Promise.all([
    campaignService.listCampaigns(workspace.id),
    campaignService.listChurnRisk(workspace.id),
    messageTemplateRepository.findByWorkspaceId(workspace.id),
  ]);

  return (
    <PageContainer className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} description={t("description")} />
      <ChurnRiskList rows={churnRisk} />
      <CampaignManager initialCampaigns={campaigns} templates={templates} />
    </PageContainer>
  );
}
