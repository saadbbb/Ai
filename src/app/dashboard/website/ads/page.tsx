import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { AdsManager } from "@/features/storefront/components/ads-manager";
import { storefrontAdService } from "@/features/storefront/services/storefront-ad.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function WebsiteAdsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");
  const t = await getTranslations("website.ads");

  const ads = await storefrontAdService.listAds(workspace.id);

  return (
    <PageContainer>
      <PageHeader title={t("heading")} />
      <AdsManager initialAds={ads} />
    </PageContainer>
  );
}
