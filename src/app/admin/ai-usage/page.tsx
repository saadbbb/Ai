import { Bot, Gauge, Percent, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RowList } from "@/components/data-table";
import { PageContainer, Section } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { StatGrid } from "@/components/stat-grid";
import { aiUsageAdminRepository } from "@/features/platform-admin/repository/ai-usage-admin.repository";

export default async function AdminAiUsagePage() {
  const t = await getTranslations("platformAdmin.aiUsage");
  const [summary, byWorkspace] = await Promise.all([
    aiUsageAdminRepository.getSummary(),
    aiUsageAdminRepository.getByWorkspace(),
  ]);
  const successRate =
    summary.totalRequests === 0 ? null : Math.round((summary.successCount / summary.totalRequests) * 100);

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />

      <StatGrid
        stats={[
          { label: t("totalRequests"), value: summary.totalRequests, icon: Bot },
          { label: t("successRate"), value: successRate === null ? "—" : `${successRate}%`, icon: Percent, tone: "success" },
          { label: t("avgLatency"), value: t("msValue", { ms: summary.avgLatencyMs }), icon: Gauge },
          {
            label: t("totalTokens"),
            value: (summary.totalInputTokens + summary.totalOutputTokens).toLocaleString(),
            icon: Zap,
          },
        ]}
      />

      <Section title={t("byWorkspaceHeading")}>
        <RowList
          items={byWorkspace}
          getRowKey={(row) => row.workspaceId}
          emptyState={{ icon: Bot, title: t("emptyState") }}
          renderRow={(row) => (
            <>
              <span className="truncate font-medium">{row.workspaceName}</span>
              <span className="shrink-0 text-muted-foreground">
                {t("workspaceRequests", { count: row.requests })} · {(row.inputTokens + row.outputTokens).toLocaleString()}{" "}
                {t("tokens")}
              </span>
            </>
          )}
        />
      </Section>
    </PageContainer>
  );
}
