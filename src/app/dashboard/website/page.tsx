import { ExternalLink, Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StorefrontEditor } from "@/features/storefront/components/storefront-editor";
import { ReviewManager } from "@/features/storefront/components/review-manager";
import { BlogManager } from "@/features/storefront/components/blog-manager";
import { blogService } from "@/features/storefront/services/blog.service";
import { reviewService } from "@/features/storefront/services/review.service";
import { storefrontService } from "@/features/storefront/services/storefront.service";
import { getAppUrl } from "@/lib/env";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function WebsitePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");
  const t = await getTranslations("website");

  const [storefront, reviews, posts] = await Promise.all([
    storefrontService.getOrCreateForWorkspace(workspace.id),
    reviewService.listReviews(workspace.id),
    blogService.listPosts(workspace.id),
  ]);
  const storeUrl = `${getAppUrl()}/store/${workspace.slug}`;

  return (
    <PageContainer className="mx-auto max-w-2xl">
      <Card className="flex-row items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Globe className="size-6" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-semibold text-foreground">{t("title")}</h1>
              <Badge variant={storefront.isPublished ? "secondary" : "outline"}>
                {storefront.isPublished ? t("publishLabel") : t("notPublished")}
              </Badge>
            </div>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary hover:underline">
              {storeUrl}
            </a>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            {t("urlHeading")}
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </Card>

      <Tabs defaultValue="storefront">
        <TabsList>
          <TabsTrigger value="storefront">{t("tabs.storefront")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("tabs.reviews")}</TabsTrigger>
          <TabsTrigger value="blog">{t("tabs.blog")}</TabsTrigger>
        </TabsList>

        <TabsContent value="storefront" className="pt-4">
          <StorefrontEditor storefront={storefront} storeUrl={storeUrl} slug={workspace.slug} />
        </TabsContent>

        <TabsContent value="reviews" className="pt-4">
          <ReviewManager initialReviews={reviews} />
        </TabsContent>

        <TabsContent value="blog" className="pt-4">
          <BlogManager initialPosts={posts} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
