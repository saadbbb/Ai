import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { RowList } from "@/components/data-table";
import { PageContainer } from "@/components/page-container";
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
    <PageContainer>
      <div className="space-y-1">
        <Link href="/dashboard/automations" className="text-sm text-muted-foreground hover:text-foreground">
          {t("backLink")}
        </Link>
        <PageHeader title={t("title")} description={t("description")} />
      </div>

      <RowList
        items={approvals}
        getRowKey={({ approval }) => approval.id}
        emptyState={{ icon: ClipboardCheck, title: t("emptyState") }}
        renderRow={({ approval, workflowName, contactName }) => (
          <>
            <div className="min-w-0">
              <p className="truncate font-medium">{t("requestedFor", { workflow: workflowName, contact: contactName })}</p>
              {approval.instructions && <p className="truncate text-sm text-muted-foreground">{approval.instructions}</p>}
            </div>
            <ApprovalDecisionButtons approvalId={approval.id} />
          </>
        )}
      />
    </PageContainer>
  );
}
