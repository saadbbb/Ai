import { History } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { buildUnifiedActivityFeed } from "@/features/workspace/lib/unified-activity";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function AuditLogPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "workspace.members.view");
  const t = await getTranslations("auditLog");

  const [activities, auditLogs] = await Promise.all([
    activityRepository.findByWorkspaceId(workspace.id),
    workspaceAuditLogRepository.findRecentForWorkspace(workspace.id),
  ]);
  const events = buildUnifiedActivityFeed(activities, auditLogs);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: workspace.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      {events.length === 0 ? (
        <EmptyState icon={History} title={t("emptyState")} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-md shadow-foreground/[0.03]">
          {events.map((event) => {
            const row = (
              <div className="flex items-center justify-between gap-4 p-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{t(`source.${event.source}`)}</Badge>
                    <p className="truncate">{event.summary}</p>
                  </div>
                  {event.actorLabel && <p className="truncate text-xs text-muted-foreground">{event.actorLabel}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatter.format(event.createdAt)}</span>
              </div>
            );

            return event.link ? (
              <Link key={event.id} href={event.link} className="block hover:bg-muted/50">
                {row}
              </Link>
            ) : (
              <div key={event.id}>{row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
