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

  return reportResponse(format, "sales", "Sales", ["Metric", "Value"], [
    ["Revenue total", summary.kpis.revenueTotal.toFixed(2)],
    ["Orders completed", summary.kpis.ordersCompleted],
    ["Average order value", summary.sales.avgOrderValue === null ? "" : summary.sales.avgOrderValue.toFixed(2)],
    ["Sales growth %", summary.sales.growthPercent === null ? "" : summary.sales.growthPercent.toFixed(1)],
    ["Repeat customer rate %", summary.sales.repeatCustomerRate === null ? "" : (summary.sales.repeatCustomerRate * 100).toFixed(1)],
    ["Top product", summary.revenueByProduct[0]?.productName ?? ""],
    ["Top product revenue", summary.revenueByProduct[0]?.revenue.toFixed(2) ?? ""],
  ]);
}
