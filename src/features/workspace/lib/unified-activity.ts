import type { Activity, WorkspaceAuditLog } from "@/db/schema";

export interface UnifiedActivityItem {
  id: string;
  source: "crm" | "admin";
  summary: string;
  actorLabel: string | null;
  link: string | null;
  createdAt: Date;
}

/**
 * PART 5's Activity Log gap: login/permission events lived only in
 * `workspace_audit_logs` while everything else (leads, orders, tags, AI
 * replies...) lived in `activities` — two feeds an Owner had to check
 * separately. This merges both into one chronological list for the
 * workspace-wide Activity Log page; the per-contact timeline stays scoped to
 * `activities` only, since admin events aren't about any one customer.
 */
export function buildUnifiedActivityFeed(activities: Activity[], auditLogs: WorkspaceAuditLog[]): UnifiedActivityItem[] {
  const crmItems: UnifiedActivityItem[] = activities.map((activity) => ({
    id: `crm-${activity.id}`,
    source: "crm",
    summary: activity.summary,
    actorLabel: null,
    link: activity.link ?? `/dashboard/contacts/${activity.contactId}`,
    createdAt: activity.createdAt,
  }));

  const adminItems: UnifiedActivityItem[] = auditLogs.map((log) => ({
    id: `admin-${log.id}`,
    source: "admin",
    summary: log.summary,
    actorLabel: log.actorEmail,
    link: null,
    createdAt: log.createdAt,
  }));

  return [...crmItems, ...adminItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
