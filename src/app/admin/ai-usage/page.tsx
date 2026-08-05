import { getTranslations } from "next-intl/server";
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
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("totalRequests")} value={summary.totalRequests} />
        <StatTile label={t("successRate")} value={successRate === null ? "—" : `${successRate}%`} />
        <StatTile label={t("avgLatency")} value={t("msValue", { ms: summary.avgLatencyMs })} />
        <StatTile
          label={t("totalTokens")}
          value={(summary.totalInputTokens + summary.totalOutputTokens).toLocaleString()}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("byWorkspaceHeading")}</h2>
        {byWorkspace.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("emptyState")}
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
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
