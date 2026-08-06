import { getTranslations } from "next-intl/server";
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
  const summary = await analyticsService.getSummary(workspace.id, range);

  const [t, tOrders, tAppointments, tChannel] = await Promise.all([
    getTranslations("analytics"),
    getTranslations("orders"),
    getTranslations("appointments"),
    getTranslations("inbox.thread.channel"),
  ]);

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
      </div>
    </div>
  );
}
