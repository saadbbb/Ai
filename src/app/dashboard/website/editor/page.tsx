import { PageContainer } from "@/components/page-container";
import { WebsiteEditorPanel } from "@/features/storefront/components/website-editor-panel";
import { storefrontService } from "@/features/storefront/services/storefront.service";
import { getAppUrl } from "@/lib/env";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function WebsiteEditorPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");

  const storefront = await storefrontService.getOrCreateForWorkspace(workspace.id);
  const storeUrl = `${getAppUrl()}/store/${workspace.slug}`;

  return (
    <PageContainer>
      <WebsiteEditorPanel storefront={storefront} storeUrl={storeUrl} slug={workspace.slug} logoUrl={workspace.logoUrl} />
    </PageContainer>
  );
}
