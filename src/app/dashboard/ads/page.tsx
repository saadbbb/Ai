import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdAccountCard } from "@/features/ads/components/ad-account-card";
import { AdCampaignManager } from "@/features/ads/components/ad-campaign-manager";
import { AdInsightsPanel } from "@/features/ads/components/ad-insights-panel";
import { AttributionReport } from "@/features/ads/components/attribution-report";
import { TrackingSettingsForm } from "@/features/ads/components/tracking-settings-form";
import { adsService } from "@/features/ads/services/ads.service";
import { storefrontService } from "@/features/storefront/services/storefront.service";
import { permissionService } from "@/features/workspace/services/permission.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function AdsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "ads");
  await requireWorkspacePermission(user.id, workspace.id, "ads.manage");
  const t = await getTranslations("ads");

  const [adAccount, campaigns, attributionStats, canManageTracking] = await Promise.all([
    adsService.getOrCreateAdAccount(workspace.id),
    adsService.listCampaigns(workspace.id),
    adsService.getAttributionReport(workspace.id),
    permissionService.hasPermission(user.id, workspace.id, "workspace.settings.manage"),
  ]);
  const storefront = canManageTracking ? await storefrontService.getOrCreateForWorkspace(workspace.id) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance">{t("tabs.performance")}</TabsTrigger>
          <TabsTrigger value="campaigns">{t("tabs.campaigns")}</TabsTrigger>
          <TabsTrigger value="account">{t("tabs.account")}</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6 pt-4">
          <AttributionReport stats={attributionStats} />
          <AdInsightsPanel />
        </TabsContent>

        <TabsContent value="campaigns" className="pt-4">
          <AdCampaignManager initialCampaigns={campaigns} />
        </TabsContent>

        <TabsContent value="account" className="space-y-6 pt-4">
          <AdAccountCard adAccount={adAccount} />
          {storefront && <TrackingSettingsForm storefront={storefront} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
