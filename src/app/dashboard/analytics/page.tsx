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
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { range: rangeParam, from: fromParam, to: toParam } = await searchParams;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "analytics");
  await requireWorkspacePermission(user.id, workspace.id, "analytics.view");

  const range = resolveAnalyticsRange(rangeParam, fromParam, toParam);
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
    today: t("range.today"),
    yesterday: t("range.yesterday"),
    "7d": t("range.7d"),
    "30d": t("range.30d"),
    "90d": t("range.90d"),
    month: t("range.month"),
    custom: t("range.custom"),
  };

  const currency = (value: number) => value.toFixed(2);
  const rangeQuery =
    range.key === "custom"
      ? `range=custom&from=${fromParam}&to=${toParam}`
      : `range=${range.key}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <DateRangeSelect value={range.key} labels={rangeLabels} applyLabel={t("range.apply")} from={fromParam} to={toParam} />
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
          responseTime: t("healthScore.breakdown.responseTime"),
          missedConversations: t("healthScore.breakdown.missedConversations"),
          automationSuccess: t("healthScore.breakdown.automationSuccess"),
          revenueTrend: t("healthScore.breakdown.revenueTrend"),
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
          <h2 className="text-sm font-medium">{t("depth.title")}</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("depth.salesReport")}</span>
              <ExportButtons reportPath={`/api/reports/sales?${rangeQuery}`} labels={exportLabels} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("depth.customersReport")}</span>
              <ExportButtons reportPath={`/api/reports/customers?${rangeQuery}`} labels={exportLabels} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("depth.channelsReport")}</span>
              <ExportButtons reportPath={`/api/reports/channels?${rangeQuery}`} labels={exportLabels} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label={t("depth.avgOrderValue")} value={summary.sales.avgOrderValue === null ? "—" : currency(summary.sales.avgOrderValue)} />
          <StatTile
            label={t("depth.salesGrowth")}
            value={summary.sales.growthPercent === null ? "—" : `${Math.round(summary.sales.growthPercent)}%`}
          />
          <StatTile
            label={t("depth.repeatCustomerRate")}
            value={summary.sales.repeatCustomerRate === null ? "—" : `${Math.round(summary.sales.repeatCustomerRate * 100)}%`}
          />
          <StatTile label={t("depth.winRate")} value={summary.leads.winRate === null ? "—" : `${Math.round(summary.leads.winRate * 100)}%`} />
          <StatTile
            label={t("depth.aiHandoffRate")}
            value={summary.ai.handoffRate === null ? "—" : `${Math.round(summary.ai.handoffRate * 100)}%`}
          />
          <StatTile
            label={t("depth.avgResponseAi")}
            value={summary.conversations.avgResponseSecondsAi === null ? "—" : t("depth.seconds", { count: Math.round(summary.conversations.avgResponseSecondsAi) })}
          />
          <StatTile
            label={t("depth.avgResponseHuman")}
            value={
              summary.conversations.avgResponseSecondsHuman === null
                ? "—"
                : t("depth.minutes", { count: Math.round(summary.conversations.avgResponseSecondsHuman / 60) })
            }
          />
          <StatTile
            label={t("depth.avgAppointmentLeadTime")}
            value={summary.appointments.avgLeadTimeHours === null ? "—" : t("depth.hours", { count: Math.round(summary.appointments.avgLeadTimeHours) })}
          />
          <StatTile label={t("depth.newCustomers")} value={summary.customers.newCount} />
          <StatTile label={t("depth.returningCustomers")} value={summary.customers.returningCount} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <LineChartCard
            title={t("charts.messagesByDay")}
            data={summary.conversations.byDay.map((row) => ({ label: row.day.slice(5), value: row.value }))}
            emptyMessage={t("charts.empty")}
          />
          <LineChartCard
            title={t("charts.appointmentsByDay")}
            data={summary.appointments.byDay.map((row) => ({ label: row.day.slice(5), value: row.value }))}
            emptyMessage={t("charts.empty")}
          />
          <BarChartCard
            title={t("charts.leadsByChannel")}
            data={summary.leads.byChannel.map((row) => ({
              label: row.channelType ? tChannel(row.channelType) : t("depth.direct"),
              value: row.count,
            }))}
            emptyMessage={t("charts.empty")}
          />
          <BarChartCard
            title={t("charts.revenueByChannel")}
            data={summary.channels.revenue.map((row) => ({
              label: row.channelType ? tChannel(row.channelType) : t("depth.direct"),
              value: row.revenue,
            }))}
            emptyMessage={t("charts.empty")}
            format="currency"
          />
          <BarChartCard
            title={t("charts.topServices")}
            data={summary.appointments.topServices.map((row) => ({ label: row.serviceName, value: row.count }))}
            emptyMessage={t("charts.empty")}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">{t("teamPerformance.title")}</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("teamPerformance.revenueReport")}</span>
              <ExportButtons reportPath={`/api/reports/revenue?${rangeQuery}`} labels={exportLabels} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("teamPerformance.title")}</span>
              <ExportButtons reportPath={`/api/reports/team-performance?${rangeQuery}`} labels={exportLabels} />
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
