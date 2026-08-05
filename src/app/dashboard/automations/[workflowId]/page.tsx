import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { automationService } from "@/features/automation/services/automation.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { AppError } from "@/lib/errors/app-error";

interface PageProps {
  params: Promise<{ workflowId: string }>;
}

export default async function WorkflowDetailPage({ params }: PageProps) {
  const { workflowId } = await params;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("automations");

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/automations" className="text-sm text-muted-foreground hover:text-foreground">
        {t("backLink")}
      </Link>

      <h1 className="text-xl font-semibold">{workflow.name}</h1>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("executionsHeading")}</h2>
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noExecutions")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
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
