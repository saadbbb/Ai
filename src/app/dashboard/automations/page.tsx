import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteWorkflowButton } from "@/features/automation/components/delete-workflow-button";
import { WorkflowStatusToggle } from "@/features/automation/components/workflow-status-toggle";
import { describeAction, describeDelay, describeTrigger } from "@/features/automation/lib/describe-workflow";
import { automationService } from "@/features/automation/services/automation.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function AutomationsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "automations");
  const [t, tLeads, tOrders, tAppointments] = await Promise.all([
    getTranslations("automations"),
    getTranslations("leads"),
    getTranslations("orders"),
    getTranslations("appointments"),
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
          {workflows.map((workflow) => {
            const delay = describeDelay(workflow, translators);
            return (
              <div key={workflow.id} className="flex items-center justify-between gap-4 p-4">
                <Link href={`/dashboard/automations/${workflow.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium hover:underline">{workflow.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {describeTrigger(workflow, translators)} → {delay ? `${delay} ` : ""}
                    {describeAction(workflow, translators)}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <WorkflowStatusToggle workflowId={workflow.id} initialStatus={workflow.status} />
                  <DeleteWorkflowButton workflowId={workflow.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
