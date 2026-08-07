import { getTranslations } from "next-intl/server";
import { CampaignManager } from "@/features/campaigns/components/campaign-manager";
import { ChurnRiskList } from "@/features/campaigns/components/churn-risk-list";
import { campaignService } from "@/features/campaigns/services/campaign.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function CampaignsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "campaigns");
  await requireWorkspacePermission(user.id, workspace.id, "campaigns.manage");
  const t = await getTranslations("campaigns");

  const [campaigns, churnRisk] = await Promise.all([
    campaignService.listCampaigns(workspace.id),
    campaignService.listChurnRisk(workspace.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <ChurnRiskList rows={churnRisk} />
      <CampaignManager initialCampaigns={campaigns} />
    </div>
  );
}
