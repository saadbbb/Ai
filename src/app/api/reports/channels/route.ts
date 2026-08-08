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

  const leadsByChannel = new Map(summary.leads.byChannel.map((row) => [row.channelType ?? "direct", row.count]));
  const revenueByChannel = new Map(summary.channels.revenue.map((row) => [row.channelType ?? "direct", row.revenue]));
  const channelKeys = new Set([
    ...summary.conversationsByChannel.map((row) => row.status as string),
    ...leadsByChannel.keys(),
    ...revenueByChannel.keys(),
  ]);

  return reportResponse(
    format,
    "channels",
    "Channels",
    ["Channel", "Conversations", "Leads", "Revenue"],
    [...channelKeys].map((channel) => [
      channel,
      summary.conversationsByChannel.find((row) => row.status === channel)?.count ?? 0,
      leadsByChannel.get(channel) ?? 0,
      (revenueByChannel.get(channel) ?? 0).toFixed(2),
    ]),
  );
}
