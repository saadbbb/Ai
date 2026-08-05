import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Workflow } from "@/db/schema";
import { DeleteWorkflowButton } from "@/features/automation/components/delete-workflow-button";
import { WorkflowStatusToggle } from "@/features/automation/components/workflow-status-toggle";
import { automationService } from "@/features/automation/services/automation.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function AutomationsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "automations");
  const t = await getTranslations("automations");
  const tLeads = await getTranslations("leads");
  const tOrders = await getTranslations("orders");

  const workflows = await automationService.listWorkflows(workspace.id);

  function describeTrigger(workflow: Workflow): string {
    if (workflow.triggerType === "lead_stage_changed") {
      const stage = workflow.triggerConfig.stage;
      return t("triggerLeadStage", { stage: stage ? tLeads(`stages.${stage}`) : "" });
    }
    if (workflow.triggerType === "order_status_changed") {
      const status = workflow.triggerConfig.status;
      return t("triggerOrderStatus", { status: status ? tOrders(`statuses.${status}`) : "" });
    }
    return t("triggerHandedOver");
  }

  function describeAction(workflow: Workflow): string {
    if (workflow.actionType === "add_contact_tag") {
      return t("actionAddTag", { tag: workflow.actionConfig.tag ?? "" });
    }
    return t("actionNotifyOwner");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/automations/new">{t("newWorkflow")}</Link>
        </Button>
      </div>

      {workflows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="flex items-center justify-between gap-4 p-4">
              <Link href={`/dashboard/automations/${workflow.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium hover:underline">{workflow.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {describeTrigger(workflow)} → {describeAction(workflow)}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <WorkflowStatusToggle workflowId={workflow.id} initialStatus={workflow.status} />
                <DeleteWorkflowButton workflowId={workflow.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
