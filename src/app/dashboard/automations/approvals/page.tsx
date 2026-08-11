import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ApprovalDecisionButtons } from "@/features/automation/components/approval-decision-buttons";
import { automationService } from "@/features/automation/services/automation.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function AutomationApprovalsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "automations");
  await requireWorkspacePermission(user.id, workspace.id, "automation.workflows.manage");
  const t = await getTranslations("automations.approvals");

  const approvals = await automationService.listPendingApprovals(workspace.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/dashboard/automations" className="text-sm text-muted-foreground hover:text-foreground">
          {t("backLink")}
        </Link>
        <PageHeader title={t("title")} description={t("description")} />
      </div>

      {approvals.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("emptyState")} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-md shadow-foreground/[0.03]">
          {approvals.map(({ approval, workflowName, contactName }) => (
            <div key={approval.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {t("requestedFor", { workflow: workflowName, contact: contactName })}
                </p>
                {approval.instructions && <p className="truncate text-sm text-muted-foreground">{approval.instructions}</p>}
              </div>
              <ApprovalDecisionButtons approvalId={approval.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
