import { ExternalLink, FileText, Globe, Image as ImageIcon, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SetupScoreCard } from "@/features/storefront/components/setup-score-card";
import { WebsiteEditorPanel } from "@/features/storefront/components/website-editor-panel";
import { storefrontService } from "@/features/storefront/services/storefront.service";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { getAppUrl } from "@/lib/env";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function WebsitePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");
  const t = await getTranslations("website");

  const [storefront, agent, products, services] = await Promise.all([
    storefrontService.getOrCreateForWorkspace(workspace.id),
    aiAgentRepository.findByWorkspaceId(workspace.id),
    productRepository.findByWorkspaceId(workspace.id),
    serviceRepository.findByWorkspaceId(workspace.id),
  ]);
  const storeUrl = `${getAppUrl()}/store/${workspace.slug}`;

  return (
    <PageContainer>
      <Card
        className="flex-row items-center justify-between gap-4 border-border-strong p-6"
        style={{
          backgroundImage:
            "radial-gradient(500px 260px at 100% -20%, rgba(42,217,168,.2), transparent 60%), linear-gradient(135deg, #23204a 0%, #171b25 60%)",
        }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-[72px] shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-primary to-accent shadow-glow">
            <Globe className="size-7 text-white" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-extrabold text-foreground">{t("title")}</h1>
              <Badge variant={storefront.isPublished ? "success" : "outline"}>
                {storefront.isPublished ? t("publishLabel") : t("notPublished")}
              </Badge>
            </div>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary hover:underline">
              {storeUrl}
            </a>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/website/pages">
              <FileText className="size-3.5" />
              {t("tabs.pages")}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/website/ads">
              <ImageIcon className="size-3.5" />
              {t("tabs.ads")}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/website/reviews">
              <Star className="size-3.5" />
              {t("tabs.reviews")}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              {t("urlHeading")}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </Card>

      <SetupScoreCard
        hasBusinessDescription={!!agent?.businessDescription?.trim()}
        hasLogo={!!workspace.logoUrl}
        hasCatalog={products.some((p) => p.isActive) || services.some((s) => s.isActive)}
        hasContactInfo={!!(storefront.contactPhone || storefront.contactEmail)}
        hasTracking={Object.values(storefront.trackingIds ?? {}).some((value) => !!value)}
      />

      <WebsiteEditorPanel storefront={storefront} storeUrl={storeUrl} slug={workspace.slug} logoUrl={workspace.logoUrl} />
    </PageContainer>
  );
}
