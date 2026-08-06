import { getTranslations } from "next-intl/server";
import { WorkspaceList } from "@/features/platform-admin/components/workspace-list";
import { planRepository } from "@/features/platform-admin/repository/plan.repository";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";
import { platformAdminService } from "@/features/platform-admin/services/platform-admin.service";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

export default async function AdminWorkspacesPage() {
  const admin = await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.workspaces");
  const [items, allPlans] = await Promise.all([workspaceAdminRepository.findAllWithOwner(), planRepository.findAll()]);
  const canImpersonate = platformAdminService.isBootstrapAdmin(admin.email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <WorkspaceList items={items} allPlans={allPlans} canImpersonate={canImpersonate} />
    </div>
  );
}
