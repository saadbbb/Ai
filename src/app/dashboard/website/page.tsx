import { ExternalLink, FileText, Globe, Image as ImageIcon, PencilRuler, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LtrLink } from "@/components/ltr-text";
import { SetupScoreCard } from "@/features/storefront/components/setup-score-card";
import { storefrontService } from "@/features/storefront/services/storefront.service";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { getAppUrl } from "@/lib/env";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function WebsiteOverviewPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");
  const t = await getTranslations("website");
  const tOverview = await getTranslations("website.overview");

  const [storefront, agent, products, services] = await Promise.all([
    storefrontService.getOrCreateForWorkspace(workspace.id),
    aiAgentRepository.findByWorkspaceId(workspace.id),
    productRepository.findByWorkspaceId(workspace.id),
    serviceRepository.findByWorkspaceId(workspace.id),
  ]);
  const storeUrl = `${getAppUrl()}/store/${workspace.slug}`;

  const quickActions = [
    { href: "/dashboard/website/editor", icon: PencilRuler, label: t("tabs.editor"), description: tOverview("editorDescription") },
    { href: "/dashboard/website/pages", icon: FileText, label: t("tabs.pages"), description: tOverview("pagesDescription") },
    { href: "/dashboard/website/ads", icon: ImageIcon, label: t("tabs.ads"), description: tOverview("adsDescription") },
    { href: "/dashboard/website/reviews", icon: Star, label: t("tabs.reviews"), description: tOverview("reviewsDescription") },
  ];

  return (
    <PageContainer>
      <Card
        className="flex-col items-start gap-4 border-border-strong p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{
          backgroundImage:
            "radial-gradient(500px 260px at 100% -20%, rgba(42,217,168,.2), transparent 60%), linear-gradient(135deg, #23204a 0%, #171b25 60%)",
        }}
      >
        <div className="flex w-full min-w-0 items-center gap-4 sm:w-auto">
          <span className="flex size-[72px] shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-primary to-accent shadow-glow">
            <Globe className="size-7 text-white" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-extrabold text-foreground">{t("title")}</h1>
              <Badge variant={storefront.isPublished ? "success" : "outline"}>
                {storefront.isPublished ? t("publishLabel") : t("notPublished")}
              </Badge>
            </div>
            <LtrLink href={storeUrl} target="_blank" rel="noopener noreferrer" className="max-w-full text-sm text-primary hover:underline">
              {storeUrl}
            </LtrLink>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm" className="w-full shrink-0 sm:w-auto">
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            {t("urlHeading")}
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </Card>

      <SetupScoreCard
        hasBusinessDescription={!!agent?.businessDescription?.trim()}
        hasLogo={!!workspace.logoUrl}
        hasCatalog={products.some((p) => p.isActive) || services.some((s) => s.isActive)}
        hasContactInfo={!!(storefront.contactPhone || storefront.contactEmail)}
        hasTracking={Object.values(storefront.trackingIds ?? {}).some((value) => !!value)}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{tOverview("quickActionsHeading")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="block transition-transform hover:-translate-y-0.5">
              <Card className="h-full">
                <CardContent className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <action.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
