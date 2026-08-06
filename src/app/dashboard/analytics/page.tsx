import { getTranslations } from "next-intl/server";
import { ExportButtons } from "@/components/export-buttons";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { BarChartCard } from "@/features/analytics/components/bar-chart-card";
import { DateRangeSelect } from "@/features/analytics/components/date-range-select";
import { LineChartCard } from "@/features/analytics/components/line-chart-card";
import { HealthScoreCard } from "@/features/analytics/components/health-score-card";
import { resolveAnalyticsRange, type AnalyticsRangeKey } from "@/features/analytics/lib/date-range";
import { analyticsService } from "@/features/analytics/services/analytics.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { range: rangeParam } = await searchParams;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "analytics");
  await requireWorkspacePermission(user.id, workspace.id, "analytics.view");

  const range = resolveAnalyticsRange(rangeParam);
  const [summary, teamPerformance] = await Promise.all([
    analyticsService.getSummary(workspace.id, range),
    analyticsService.getTeamPerformance(workspace.id, range),
  ]);

  const [t, tOrders, tAppointments, tChannel, tCommon] = await Promise.all([
    getTranslations("analytics"),
    getTranslations("orders"),
    getTranslations("appointments"),
    getTranslations("inbox.thread.channel"),
    getTranslations("common"),
  ]);
  const exportLabels = { csv: tCommon("exportCsv"), excel: tCommon("exportExcel"), pdf: tCommon("exportPdf") };

  const rangeLabels: Record<AnalyticsRangeKey, string> = {
    "7d": t("range.7d"),
    "30d": t("range.30d"),
    "90d": t("range.90d"),
    month: t("range.month"),
  };

  const currency = (value: number) => value.toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <DateRangeSelect value={range.key} labels={rangeLabels} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label={t("kpis.newLeads")} value={summary.kpis.newLeads} />
        <StatTile label={t("kpis.revenue")} value={currency(summary.kpis.revenueTotal)} />
        <StatTile label={t("kpis.ordersCompleted")} value={summary.kpis.ordersCompleted} />
        <StatTile label={t("kpis.appointmentsCompleted")} value={summary.kpis.appointmentsCompleted} />
        <StatTile label={t("kpis.aiRequests")} value={summary.kpis.aiRequests} />
        <StatTile
          label={t("kpis.aiSuccessRate")}
          value={summary.kpis.aiSuccessRate === null ? "—" : `${Math.round(summary.kpis.aiSuccessRate * 100)}%`}
        />
      </div>

      <HealthScoreCard
        healthScore={summary.healthScore}
        title={t("healthScore.title")}
        noDataMessage={t("healthScore.noData")}
        levelLabels={{
          excellent: t("healthScore.levels.excellent"),
          good: t("healthScore.levels.good"),
          needs_attention: t("healthScore.levels.needs_attention"),
          critical: t("healthScore.levels.critical"),
        }}
        breakdownLabels={{
          leadConversion: t("healthScore.breakdown.leadConversion"),
          orderCompletion: t("healthScore.breakdown.orderCompletion"),
          appointmentCompletion: t("healthScore.breakdown.appointmentCompletion"),
          aiSuccess: t("healthScore.breakdown.aiSuccess"),
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartCard
          title={t("charts.leadsByDay")}
          data={summary.leadsByDay.map((row) => ({ label: row.day.slice(5), value: row.value }))}
          emptyMessage={t("charts.empty")}
        />
        <LineChartCard
          title={t("charts.revenueByDay")}
          data={summary.revenueByDay.map((row) => ({ label: row.day.slice(5), value: row.value }))}
          emptyMessage={t("charts.empty")}
          format="currency"
        />
        <BarChartCard
          title={t("charts.ordersByStatus")}
          data={summary.ordersByStatus.map((row) => ({ label: tOrders(`statuses.${row.status}`), value: row.count }))}
          emptyMessage={t("charts.empty")}
        />
        <BarChartCard
          title={t("charts.appointmentsByStatus")}
          data={summary.appointmentsByStatus.map((row) => ({
            label: tAppointments(`statuses.${row.status}`),
            value: row.count,
          }))}
          emptyMessage={t("charts.empty")}
        />
        <BarChartCard
          title={t("charts.conversationsByChannel")}
          data={summary.conversationsByChannel.map((row) => ({ label: tChannel(row.status), value: row.count }))}
          emptyMessage={t("charts.empty")}
        />
        <BarChartCard
          title={t("charts.revenueByProduct")}
          data={summary.revenueByProduct.map((row) => ({ label: row.productName, value: row.revenue }))}
          emptyMessage={t("charts.empty")}
          format="currency"
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">{t("teamPerformance.title")}</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("teamPerformance.revenueReport")}</span>
              <ExportButtons reportPath={`/api/reports/revenue?range=${range.key}`} labels={exportLabels} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("teamPerformance.title")}</span>
              <ExportButtons reportPath={`/api/reports/team-performance?range=${range.key}`} labels={exportLabels} />
            </div>
          </div>
        </div>
        {teamPerformance.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("teamPerformance.empty")}
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            <div className="flex items-center justify-between gap-4 p-3 text-xs font-medium text-muted-foreground">
              <span className="flex-1">{t("teamPerformance.columns.agent")}</span>
              <span className="w-32 text-right">{t("teamPerformance.columns.conversations")}</span>
              <span className="w-32 text-right">{t("teamPerformance.columns.tasksCompleted")}</span>
              <span className="w-40 text-right">{t("teamPerformance.columns.avgResponseTime")}</span>
            </div>
            {teamPerformance.map((row) => (
              <div key={row.userId} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span className="flex-1 truncate">{row.email}</span>
                <span className="w-32 text-right">{row.conversationsHandled}</span>
                <span className="w-32 text-right">{row.tasksCompleted}</span>
                <span className="w-40 text-right text-muted-foreground">
                  {row.avgResponseMinutes === null ? "—" : t("teamPerformance.minutes", { count: row.avgResponseMinutes })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
