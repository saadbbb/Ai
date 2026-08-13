import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { ReviewManager } from "@/features/storefront/components/review-manager";
import { reviewService } from "@/features/storefront/services/review.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function WebsiteReviewsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");
  const t = await getTranslations("website.reviews");

  const reviews = await reviewService.listReviews(workspace.id);

  return (
    <PageContainer>
      <PageHeader title={t("heading")} />
      <ReviewManager initialReviews={reviews} />
    </PageContainer>
  );
}
