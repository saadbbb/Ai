import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { parseReportFormat, reportResponse } from "@/lib/report-response";
import { invoiceRepository } from "@/features/platform-admin/repository/invoice.repository";
import { refundRepository } from "@/features/platform-admin/repository/refund.repository";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";

type ReportType = "subscriptions" | "invoices" | "refunds";

function parseReportType(value: string | null): ReportType {
  return value === "subscriptions" || value === "refunds" ? value : "invoices";
}

export async function GET(request: Request) {
  await requirePlatformAdmin();

  const url = new URL(request.url);
  const format = parseReportFormat(url.searchParams.get("format"));
  const type = parseReportType(url.searchParams.get("type"));

  if (type === "subscriptions") {
    const workspaces = await workspaceAdminRepository.findAllWithOwner();
    return reportResponse(
      format,
      "subscriptions",
      "Subscriptions",
      ["Workspace", "Owner", "Plan", "Status", "Expires At"],
      workspaces.map(({ workspace, ownerEmail, plan }) => [
        workspace.name,
        ownerEmail ?? "—",
        plan?.name ?? "—",
        workspace.subscriptionStatus,
        workspace.subscriptionExpiresAt ? workspace.subscriptionExpiresAt.toISOString().slice(0, 10) : "—",
      ]),
    );
  }

  if (type === "refunds") {
    const refunds = await refundRepository.findAllWithWorkspace();
    return reportResponse(
      format,
      "refunds",
      "Refunds",
      ["Workspace", "Amount", "Currency", "Reason", "Status", "Requested At"],
      refunds.map(({ refund, workspaceName }) => [
        workspaceName,
        refund.amount,
        refund.currency,
        refund.reason,
        refund.status,
        refund.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }

  const invoices = await invoiceRepository.findRecentWithWorkspace(10_000);
  return reportResponse(
    format,
    "invoices",
    "Invoices",
    ["Invoice #", "Workspace", "Plan", "Amount", "Currency", "Status", "Issued At"],
    invoices.map(({ invoice, workspaceName }) => [
      invoice.invoiceNumber,
      workspaceName,
      invoice.planName,
      invoice.amount,
      invoice.currency,
      invoice.status,
      invoice.issuedAt.toISOString().slice(0, 10),
    ]),
  );
}
