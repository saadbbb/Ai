import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <PageHeader title={t("title")} description={t("description")} />
        <Link href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
          {storeUrl}
        </Link>
      </div>
      <StorefrontEditor storefront={storefront} storeUrl={storeUrl} slug={workspace.slug} />
      <ReviewManager initialReviews={reviews} />
      <BlogManager initialPosts={posts} />
    </div>
  );
}
