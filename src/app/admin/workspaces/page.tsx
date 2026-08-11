import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { WorkspaceList } from "@/features/platform-admin/components/workspace-list";
import { aiUsageAdminRepository } from "@/features/platform-admin/repository/ai-usage-admin.repository";
import { planRepository } from "@/features/platform-admin/repository/plan.repository";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";
import { platformAdminService } from "@/features/platform-admin/services/platform-admin.service";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

export default async function AdminWorkspacesPage() {
  const admin = await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.workspaces");
  const [items, allPlans, aiUsageByWorkspace] = await Promise.all([
    workspaceAdminRepository.findAllWithOwner(),
    planRepository.findAll(),
    aiUsageAdminRepository.getByWorkspace(),
  ]);
  const canImpersonate = platformAdminService.isBootstrapAdmin(admin.email);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <WorkspaceList
        items={items}
        allPlans={allPlans}
        canImpersonate={canImpersonate}
        canDelete={canImpersonate}
        aiUsageByWorkspace={aiUsageByWorkspace}
      />
    </div>
  );
}
