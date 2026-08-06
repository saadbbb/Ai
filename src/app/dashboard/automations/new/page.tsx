import { getTranslations } from "next-intl/server";
import { WorkflowCanvas } from "@/features/automation/components/workflow-canvas/workflow-canvas";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function NewWorkflowPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "automations");
  await requireWorkspacePermission(user.id, workspace.id, "automation.workflows.manage");
  const t = await getTranslations("automations.new");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <WorkflowCanvas />
    </div>
  );
}
