import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { describeAction, describeConditions, describeDelay, describeTrigger } from "@/features/automation/lib/describe-workflow";
import { automationService } from "@/features/automation/services/automation.service";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { AppError } from "@/lib/errors/app-error";

interface PageProps {
  params: Promise<{ workflowId: string }>;
}

export default async function WorkflowDetailPage({ params }: PageProps) {
  const { workflowId } = await params;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "automation.workflows.view");
  const [t, tLeads, tOrders, tAppointments] = await Promise.all([
    getTranslations("automations"),
    getTranslations("leads"),
    getTranslations("orders"),
    getTranslations("appointments"),
  ]);
  const translators = { automations: t, leads: tLeads, orders: tOrders, appointments: tAppointments };

  let data;
  try {
    data = await automationService.getWorkflowWithExecutions(workspace.id, workflowId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { workflow, executions } = data;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: workspace.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const delay = describeDelay(workflow, translators);
  const conditions = describeConditions(workflow, translators);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/automations" className="text-sm text-muted-foreground hover:text-foreground">
        {t("backLink")}
      </Link>

      <div className="space-y-1">
        <PageHeader
          title={workflow.name}
          description={`${describeTrigger(workflow, translators)} → ${delay ? `${delay} ` : ""}${describeAction(workflow, translators)}`}
        />
        {conditions && <p className="text-sm text-muted-foreground">{conditions}</p>}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("executionsHeading")}</h2>
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noExecutions")}</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-md shadow-foreground/[0.03]">
            {executions.map((execution) => (
              <div key={execution.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span className="text-muted-foreground">{formatter.format(execution.triggeredAt)}</span>
                <span className={execution.success ? "text-primary" : "text-destructive"}>
                  {execution.success ? execution.summary || t("succeeded") : execution.errorMessage || t("failed")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
