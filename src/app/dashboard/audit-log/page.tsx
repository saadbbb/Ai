import { getTranslations } from "next-intl/server";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function AuditLogPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "workspace.members.view");
  const t = await getTranslations("auditLog");

  const events = await workspaceAuditLogRepository.findRecentForWorkspace(workspace.id);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: workspace.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-4 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate">{event.summary}</p>
                <p className="truncate text-xs text-muted-foreground">{event.actorEmail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatter.format(event.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
