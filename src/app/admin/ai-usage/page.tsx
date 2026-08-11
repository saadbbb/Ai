import { Bot, Gauge, Percent, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/features/dashboard/components/stat-tile";
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
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("totalRequests")} value={summary.totalRequests} icon={Bot} />
        <StatTile
          label={t("successRate")}
          value={successRate === null ? "—" : `${successRate}%`}
          icon={Percent}
          tone="success"
        />
        <StatTile label={t("avgLatency")} value={t("msValue", { ms: summary.avgLatencyMs })} icon={Gauge} />
        <StatTile
          label={t("totalTokens")}
          value={(summary.totalInputTokens + summary.totalOutputTokens).toLocaleString()}
          icon={Zap}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("byWorkspaceHeading")}</h2>
        {byWorkspace.length === 0 ? (
          <EmptyState icon={Bot} title={t("emptyState")} />
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-md shadow-foreground/[0.03]">
            {byWorkspace.map((row) => (
              <div key={row.workspaceId} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span className="truncate font-medium">{row.workspaceName}</span>
                <span className="shrink-0 text-muted-foreground">
                  {t("workspaceRequests", { count: row.requests })} ·{" "}
                  {(row.inputTokens + row.outputTokens).toLocaleString()} {t("tokens")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
