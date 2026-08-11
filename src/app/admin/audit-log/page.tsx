import { History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RowList } from "@/components/data-table";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { auditLogRepository } from "@/features/platform-admin/repository/audit-log.repository";

export default async function AdminAuditLogPage() {
  const t = await getTranslations("platformAdmin.auditLog");
  const entries = await auditLogRepository.findRecent();

  const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />

      <RowList
        items={entries}
        getRowKey={(entry) => entry.id}
        emptyState={{ icon: History, title: t("emptyState") }}
        renderRow={(entry) => (
          <>
            <div>
              <p>{entry.summary}</p>
              <p className="text-xs text-muted-foreground">{entry.actorEmail}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatter.format(entry.createdAt)}</span>
          </>
        )}
      />
    </PageContainer>
  );
}
