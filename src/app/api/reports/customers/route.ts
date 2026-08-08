import { analyticsService } from "@/features/analytics/services/analytics.service";
import { resolveAnalyticsRange } from "@/features/analytics/lib/date-range";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { parseReportFormat, reportResponse } from "@/lib/report-response";

export async function GET(request: Request) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "analytics");
  await requireWorkspacePermission(user.id, workspace.id, "analytics.view");

  const url = new URL(request.url);
  const format = parseReportFormat(url.searchParams.get("format"));
  const range = resolveAnalyticsRange(
    url.searchParams.get("range") ?? undefined,
    url.searchParams.get("from") ?? undefined,
    url.searchParams.get("to") ?? undefined,
  );
  const summary = await analyticsService.getSummary(workspace.id, range);

  return reportResponse(format, "customers", "Customers", ["Metric", "Value"], [
    ["New customers", summary.customers.newCount],
    ["Returning customers", summary.customers.returningCount],
    ["Repeat customer rate %", summary.sales.repeatCustomerRate === null ? "" : (summary.sales.repeatCustomerRate * 100).toFixed(1)],
    ["Lead win rate %", summary.leads.winRate === null ? "" : (summary.leads.winRate * 100).toFixed(1)],
  ]);
}
