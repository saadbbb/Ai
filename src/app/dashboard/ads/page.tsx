import { getTranslations } from "next-intl/server";
import { AdAccountCard } from "@/features/ads/components/ad-account-card";
import { AdCampaignManager } from "@/features/ads/components/ad-campaign-manager";
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
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <AdAccountCard adAccount={adAccount} />
      <AttributionReport stats={attributionStats} />
      <AdCampaignManager initialCampaigns={campaigns} />
    </div>
  );
}
