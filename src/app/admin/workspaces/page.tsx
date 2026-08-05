import { getTranslations } from "next-intl/server";
import { WorkspaceRow } from "@/features/platform-admin/components/workspace-row";
import { planRepository } from "@/features/platform-admin/repository/plan.repository";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";

export default async function AdminWorkspacesPage() {
  const t = await getTranslations("platformAdmin.workspaces");
  const [items, allPlans] = await Promise.all([workspaceAdminRepository.findAllWithOwner(), planRepository.findAll()]);

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
          {items.map(({ workspace, ownerEmail, plan }) => (
            <WorkspaceRow
              key={workspace.id}
              workspace={workspace}
              ownerEmail={ownerEmail}
              initialPlan={plan}
              allPlans={allPlans}
            />
          ))}
        </div>
      )}
    </div>
  );
}
