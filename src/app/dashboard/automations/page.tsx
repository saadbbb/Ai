import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteWorkflowButton } from "@/features/automation/components/delete-workflow-button";
import { WorkflowStatusToggle } from "@/features/automation/components/workflow-status-toggle";
import { describeAction, describeConditions, describeDelay, describeTrigger } from "@/features/automation/lib/describe-workflow";
import { automationService } from "@/features/automation/services/automation.service";
import { permissionService } from "@/features/workspace/services/permission.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function AutomationsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "automations");
  await requireWorkspacePermission(user.id, workspace.id, "automation.workflows.view");
  const [t, tLeads, tOrders, tAppointments, tCommon, canManage] = await Promise.all([
    getTranslations("automations"),
    getTranslations("leads"),
    getTranslations("orders"),
    getTranslations("appointments"),
    getTranslations("common"),
    permissionService.hasPermission(user.id, workspace.id, "automation.workflows.manage"),
  ]);
  const translators = { automations: t, leads: tLeads, orders: tOrders, appointments: tAppointments };

  const workflows = await automationService.listWorkflows(workspace.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/automations/approvals">{t("approvals.navLink")}</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href="/api/reports/automations">{tCommon("exportCsv")}</a>
          </Button>
          {canManage && (
            <Button asChild>
              <Link href="/dashboard/automations/new">{t("newWorkflow")}</Link>
            </Button>
          )}
        </div>
      </div>

      {workflows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {workflows.map((workflow) => {
            const delay = describeDelay(workflow, translators);
            const conditions = describeConditions(workflow, translators);
            return (
              <div key={workflow.id} className="flex items-center justify-between gap-4 p-4">
                <Link href={`/dashboard/automations/${workflow.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium hover:underline">{workflow.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {describeTrigger(workflow, translators)} → {delay ? `${delay} ` : ""}
                    {describeAction(workflow, translators)}
                  </p>
                  {conditions && <p className="truncate text-xs text-muted-foreground">{conditions}</p>}
                </Link>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <WorkflowStatusToggle workflowId={workflow.id} initialStatus={workflow.status} />
                    <DeleteWorkflowButton workflowId={workflow.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
