import { getTranslations } from "next-intl/server";
import { auditLogRepository } from "@/features/platform-admin/repository/audit-log.repository";

export default async function AdminAuditLogPage() {
  const t = await getTranslations("platformAdmin.auditLog");
  const entries = await auditLogRepository.findRecent();

  const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-4 p-3 text-sm">
              <div>
                <p>{entry.summary}</p>
                <p className="text-xs text-muted-foreground">{entry.actorEmail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatter.format(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
