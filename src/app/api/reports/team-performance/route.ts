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
  const rows = await analyticsService.getTeamPerformance(workspace.id, range);

  return reportResponse(
    format,
    "team-performance",
    "Team Performance",
    ["Email", "Conversations Handled", "Tasks Completed", "Avg Response Time (minutes)"],
    rows.map((row) => [row.email, row.conversationsHandled, row.tasksCompleted, row.avgResponseMinutes ?? ""]),
  );
}
