import { History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { auditLogRepository } from "@/features/platform-admin/repository/audit-log.repository";

export default async function AdminAuditLogPage() {
  const t = await getTranslations("platformAdmin.auditLog");
  const entries = await auditLogRepository.findRecent();

  const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {entries.length === 0 ? (
        <EmptyState icon={History} title={t("emptyState")} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
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
