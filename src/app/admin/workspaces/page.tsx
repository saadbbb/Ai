import { getTranslations } from "next-intl/server";
import { WorkspaceSubscriptionSelect } from "@/features/platform-admin/components/workspace-subscription-select";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";

export default async function AdminWorkspacesPage() {
  const t = await getTranslations("platformAdmin.workspaces");
  const items = await workspaceAdminRepository.findAllWithOwner();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map(({ workspace, ownerEmail }) => (
            <div key={workspace.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{workspace.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {ownerEmail ?? t("noOwner")} · {new Date(workspace.createdAt).toISOString().slice(0, 10)}
                </p>
              </div>
              <div className="w-36 shrink-0">
                <WorkspaceSubscriptionSelect workspaceId={workspace.id} initialStatus={workspace.subscriptionStatus} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
