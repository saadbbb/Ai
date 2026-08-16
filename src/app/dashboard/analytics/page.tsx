import { BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { DataTable } from "@/components/data-table";
import { ExportButtons } from "@/components/export-buttons";
import { PageContainer, Section } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { StatGrid } from "@/components/stat-grid";
import { DateRangeSelect } from "@/features/analytics/components/date-range-select";
import { HealthScoreCard } from "@/features/analytics/components/health-score-card";

// recharts is a heavy dependency (~100kb+) — split into its own chunk so it
// doesn't ship on pages that don't render a chart.
const BarChartCard = dynamic(() => import("@/features/analytics/components/bar-chart-card").then((m) => m.BarChartCard));
const LineChartCard = dynamic(() => import("@/features/analytics/components/line-chart-card").then((m) => m.LineChartCard));
import { resolveAnalyticsRange, type AnalyticsRangeKey } from "@/features/analytics/lib/date-range";
import { analyticsService } from "@/features/analytics/services/analytics.service";
import { featureAccessService } from "@/features/platform-admin/services/feature-access.service";
import { storefrontAnalyticsService } from "@/features/storefront/services/storefront-analytics.service";
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
  const hasWebsiteFeature = await featureAccessService.hasFeature(workspace, "website");
  const [summary, teamPerformance, websiteSummary] = await Promise.all([
    analyticsService.getSummary(workspace.id, range),
    analyticsService.getTeamPerformance(workspace.id, range),
    hasWebsiteFeature ? storefrontAnalyticsService.getWebsiteSummary(workspace.id, range) : Promise.resolve(null),
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
    <PageContainer>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <DateRangeSelect value={range.key} labels={rangeLabels} applyLabel={t("range.apply")} from={fromParam} to={toParam} />
        }
      />

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

      <StatGrid
        className="sm:grid-cols-3 lg:grid-cols-6"
        stats={[
          { label: t("kpis.newLeads"), value: summary.kpis.newLeads },
          { label: t("kpis.revenue"), value: currency(summary.kpis.revenueTotal) },
          { label: t("kpis.ordersCompleted"), value: summary.kpis.ordersCompleted },
          { label: t("kpis.appointmentsCompleted"), value: summary.kpis.appointmentsCompleted },
          { label: t("kpis.aiRequests"), value: summary.kpis.aiRequests },
          {
            label: t("kpis.aiSuccessRate"),
            value: summary.kpis.aiSuccessRate === null ? "—" : `${Math.round(summary.kpis.aiSuccessRate * 100)}%`,
          },
        ]}
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

      <Section
        title={t("depth.title")}
        actions={
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
        }
      >
        <StatGrid
          className="sm:grid-cols-3 lg:grid-cols-5"
          size="compact"
          stats={[
            { label: t("depth.avgOrderValue"), value: summary.sales.avgOrderValue === null ? "—" : currency(summary.sales.avgOrderValue) },
            {
              label: t("depth.salesGrowth"),
              value: summary.sales.growthPercent === null ? "—" : `${Math.round(summary.sales.growthPercent)}%`,
            },
            {
              label: t("depth.repeatCustomerRate"),
              value: summary.sales.repeatCustomerRate === null ? "—" : `${Math.round(summary.sales.repeatCustomerRate * 100)}%`,
            },
            { label: t("depth.winRate"), value: summary.leads.winRate === null ? "—" : `${Math.round(summary.leads.winRate * 100)}%` },
            {
              label: t("depth.aiHandoffRate"),
              value: summary.ai.handoffRate === null ? "—" : `${Math.round(summary.ai.handoffRate * 100)}%`,
            },
            {
              label: t("depth.avgResponseAi"),
              value:
                summary.conversations.avgResponseSecondsAi === null
                  ? "—"
                  : t("depth.seconds", { count: Math.round(summary.conversations.avgResponseSecondsAi) }),
            },
            {
              label: t("depth.avgResponseHuman"),
              value:
                summary.conversations.avgResponseSecondsHuman === null
                  ? "—"
                  : t("depth.minutes", { count: Math.round(summary.conversations.avgResponseSecondsHuman / 60) }),
            },
            {
              label: t("depth.avgAppointmentLeadTime"),
              value:
                summary.appointments.avgLeadTimeHours === null
                  ? "—"
                  : t("depth.hours", { count: Math.round(summary.appointments.avgLeadTimeHours) }),
            },
            { label: t("depth.newCustomers"), value: summary.customers.newCount },
            { label: t("depth.returningCustomers"), value: summary.customers.returningCount },
          ]}
        />

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
      </Section>

      <Section
        title={t("teamPerformance.title")}
        actions={
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
        }
      >
        <DataTable
          rows={teamPerformance}
          getRowKey={(row) => row.userId}
          emptyState={{ icon: BarChart3, title: t("teamPerformance.empty") }}
          columns={[
            { key: "agent", header: t("teamPerformance.columns.agent"), cell: (row) => row.name ?? row.email ?? "—" },
            {
              key: "conversations",
              header: t("teamPerformance.columns.conversations"),
              cell: (row) => row.conversationsHandled,
              className: "text-end",
            },
            {
              key: "tasks",
              header: t("teamPerformance.columns.tasksCompleted"),
              cell: (row) => row.tasksCompleted,
              className: "text-end",
            },
            {
              key: "avgResponse",
              header: t("teamPerformance.columns.avgResponseTime"),
              cell: (row) => (row.avgResponseMinutes === null ? "—" : t("teamPerformance.minutes", { count: row.avgResponseMinutes })),
              className: "text-end text-muted-foreground",
            },
          ]}
        />
      </Section>

      {websiteSummary && (
        <Section title={t("website.title")}>
          <StatGrid
            className="sm:grid-cols-3 lg:grid-cols-3"
            size="compact"
            stats={[
              { label: t("website.pageViews"), value: websiteSummary.pageViews },
              { label: t("website.productViews"), value: websiteSummary.productViews },
              { label: t("website.formSubmissions"), value: websiteSummary.formSubmissions },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChartCard
              title={t("website.topProducts")}
              data={websiteSummary.topProducts.map((row) => ({ label: row.productName, value: row.count }))}
              emptyMessage={t("charts.empty")}
            />
            <BarChartCard
              title={t("website.formBreakdown")}
              data={websiteSummary.formBreakdown.map((row) => ({ label: t(`website.formTypes.${row.formType}`), value: row.count }))}
              emptyMessage={t("charts.empty")}
            />
          </div>
        </Section>
      )}
    </PageContainer>
  );
}
