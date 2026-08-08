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

  return reportResponse(
    format,
    "revenue",
    "Revenue by Day",
    ["Date", "Revenue"],
    summary.revenueByDay.map((row) => [row.day, row.value.toFixed(2)]),
  );
}
