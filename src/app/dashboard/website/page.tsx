import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { StorefrontEditor } from "@/features/storefront/components/storefront-editor";
import { storefrontService } from "@/features/storefront/services/storefront.service";
import { getAppUrl } from "@/lib/env";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function WebsitePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "website");
  await requireWorkspacePermission(user.id, workspace.id, "workspace.settings.manage");
  const t = await getTranslations("website");

  const storefront = await storefrontService.getOrCreateForWorkspace(workspace.id);
  const storeUrl = `${getAppUrl()}/store/${workspace.slug}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Link href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
          {storeUrl}
        </Link>
      </div>
      <StorefrontEditor storefront={storefront} storeUrl={storeUrl} />
    </div>
  );
}
