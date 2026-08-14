import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { PagesManager } from "@/features/storefront/components/pages-manager";
import { storefrontPageService } from "@/features/storefront/services/storefront-page.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function WebsitePagesPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");
  const t = await getTranslations("website.pages");

  const pages = await storefrontPageService.listPages(workspace.id);

  return (
    <PageContainer>
      <PageHeader title={t("heading")} />
      <PagesManager initialPages={pages} />
    </PageContainer>
  );
}
