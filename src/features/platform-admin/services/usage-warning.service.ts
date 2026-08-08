import "server-only";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { usageService, type UsageDimension } from "./usage.service";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";

const WARNING_THRESHOLD = 80;

const DIMENSION_LABELS: Record<UsageDimension, string> = {
  users: "Team members",
  aiAgents: "AI agents",
  channels: "Connected channels",
  conversationsPerMonth: "Conversations this month",
  knowledgeFiles: "Knowledge documents",
  automationWorkflows: "Automation workflows",
  integrations: "Integrations",
};

export interface UsageWarningResult {
  checked: number;
  warned: number;
}

/**
 * Runs once a day via /api/cron/usage-warnings (see vercel.json) — PART 8's
 * "Usage Warnings" (80/90/95% thresholds). Simplified to a single 80%+
 * threshold with one combined notification per workspace per day (rather
 * than separately tracking which of 80/90/95 was last sent per dimension) —
 * a daily nudge while any dimension is near/at its limit is the useful
 * behavior; the exact percentage is shown in the message body itself, and
 * the tenant billing page (see usage.service.ts) always shows the live bars.
 * Never throws for a single workspace's failure, same pattern as
 * subscriptionCheckService/crmFollowupsService.
 */
async function runDailyCheck(): Promise<UsageWarningResult> {
  const active = await workspaceAdminRepository.findActiveWorkspacesWithPlan();
  let warned = 0;

  for (const { workspace, plan } of active) {
    try {
      const snapshot = await usageService.getUsageSnapshot(workspace.id, plan);
      const nearLimit = (Object.entries(snapshot) as [UsageDimension, (typeof snapshot)[UsageDimension]][]).filter(
        ([, metric]) => metric.percentUsed !== null && metric.percentUsed >= WARNING_THRESHOLD,
      );
      if (nearLimit.length === 0) continue;

      const summary = nearLimit
        .map(([dimension, metric]) => `${DIMENSION_LABELS[dimension]}: ${metric.used}/${metric.limit} (${metric.percentUsed}%)`)
        .join(", ");

      await notificationRepository.create({
        workspaceId: workspace.id,
        type: "usage_warning",
        title: "Approaching a usage limit",
        message: `Your workspace is close to its plan's usage limits — ${summary}.`,
        link: "/dashboard/billing",
      });
      warned += 1;
    } catch (error) {
      console.error(`[usage-warnings] failed for workspace ${workspace.id}:`, error);
    }
  }

  return { checked: active.length, warned };
}

export const usageWarningService = {
  runDailyCheck,
};
