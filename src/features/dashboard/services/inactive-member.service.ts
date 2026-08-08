import "server-only";
import { analyticsRepository } from "@/features/analytics/repository/analytics.repository";
import { notifyWorkspaceOwner } from "@/features/notifications/services/notify-owner.service";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";

const INACTIVITY_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface InactiveMemberResult {
  checked: number;
  notified: number;
}

/**
 * Runs once a day via /api/cron/inactive-members (see vercel.json) — PART 7's
 * Dashboard Notifications example: "team member X hasn't logged in / been
 * active." No login-tracking exists (see DEFERRED_TASKS.md's error-monitoring
 * gap), so "active" here means handled a conversation or completed a task in
 * the last INACTIVITY_DAYS — a real, available proxy. Owners are excluded
 * (there's no one to notify above them, and they aren't expected to run a
 * daily quota of assigned work). Never throws for a single workspace's
 * failure, same pattern as subscriptionCheckService.
 */
async function runDailyCheck(): Promise<InactiveMemberResult> {
  const since = new Date(Date.now() - INACTIVITY_DAYS * DAY_MS);
  const now = new Date();
  const workspaces = await workspaceAdminRepository.findAllInGoodStanding();
  let checked = 0;
  let notified = 0;

  for (const workspace of workspaces) {
    try {
      const [members, conversationCounts, taskCounts] = await Promise.all([
        membershipRepository.findMembersByWorkspaceId(workspace.id),
        analyticsRepository.conversationsByAgent(workspace.id, since, now),
        analyticsRepository.tasksCompletedByAgent(workspace.id, since, now),
      ]);

      const activeUserIds = new Set([
        ...conversationCounts.filter((row) => row.count > 0).map((row) => row.userId),
        ...taskCounts.filter((row) => row.count > 0).map((row) => row.userId),
      ]);

      for (const { member, user, role } of members) {
        checked += 1;
        if (role.key === "owner") continue;
        if (member.joinedAt > since) continue; // too new to judge
        if (activeUserIds.has(user.id)) continue;

        await notifyWorkspaceOwner({
          workspaceId: workspace.id,
          type: "dashboard",
          title: "A team member has gone quiet",
          message: `${user.email} hasn't handled a conversation or completed a task in the last ${INACTIVITY_DAYS} days.`,
          link: "/dashboard/team",
        });
        notified += 1;
      }
    } catch (error) {
      console.error(`[inactive-members] failed for workspace ${workspace.id}:`, error);
    }
  }

  return { checked, notified };
}

export const inactiveMemberService = {
  runDailyCheck,
};
