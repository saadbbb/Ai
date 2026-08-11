import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { AdAccountCard } from "@/features/ads/components/ad-account-card";
import { AdCampaignManager } from "@/features/ads/components/ad-campaign-manager";
import { AdInsightsPanel } from "@/features/ads/components/ad-insights-panel";
import { AttributionReport } from "@/features/ads/components/attribution-report";
import { adsService } from "@/features/ads/services/ads.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function AdsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "ads");
  await requireWorkspacePermission(user.id, workspace.id, "ads.manage");
  const t = await getTranslations("ads");

  const adAccount = await adsService.getOrCreateAdAccount(workspace.id);
  const [campaigns, attributionStats] = await Promise.all([
    adsService.listCampaigns(workspace.id),
    adsService.getAttributionReport(workspace.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <AdAccountCard adAccount={adAccount} />
      <AttributionReport stats={attributionStats} />
      <AdInsightsPanel />
      <AdCampaignManager initialCampaigns={campaigns} />
    </div>
  );
}
