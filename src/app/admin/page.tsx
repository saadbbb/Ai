import {
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  Gauge,
  LifeBuoy,
  PauseCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { RowList } from "@/components/data-table";
import { PageContainer, Section } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { enumerateDays } from "@/features/analytics/lib/date-range";

// recharts is a heavy dependency (~100kb+) — split into its own chunk so it
// doesn't ship on pages that don't render a chart.
const LineChartCard = dynamic(() => import("@/features/analytics/components/line-chart-card").then((m) => m.LineChartCard));
import { StatGrid } from "@/components/stat-grid";
import { calculateRevenue } from "@/features/platform-admin/lib/revenue";
import { aiUsageAdminRepository } from "@/features/platform-admin/repository/ai-usage-admin.repository";
import { type DayCount, workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";
import { ticketAdminRepository } from "@/features/support/repository/ticket-admin.repository";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

const TREND_DAYS = 30;

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}

function toChartData(days: string[], counts: DayCount[]): { label: string; value: number }[] {
  const byDay = new Map(counts.map((row) => [row.day, row.count]));
  return days.map((day) => ({ label: day.slice(5), value: byDay.get(day) ?? 0 }));
}

/**
 * The Super Admin landing page — before this, /admin had no page of its own,
 * just nav links straight into /admin/workspaces (PART 9 gap: "no unified
 * Super Admin home dashboard"). Composes the same repositories the
 * /admin/revenue and /admin/ai-usage pages already use rather than
 * introducing a new aggregation table — cheap at the platform's current
 * scale, same reasoning dashboardService already documents for the tenant
 * Home page.
 */
export default async function AdminHomePage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.home");

  const since = new Date(Date.now() - (TREND_DAYS - 1) * 24 * 60 * 60 * 1000);
  const days = enumerateDays(since, new Date());

  const [workspaces, subscriptions, aiSummary, signups, activeWorkspaces, ticketCounts] = await Promise.all([
    workspaceAdminRepository.findAllWithOwner(),
    workspaceAdminRepository.findActiveWithPlan(),
    aiUsageAdminRepository.getSummary(),
    workspaceAdminRepository.signupsByDay(since),
    workspaceAdminRepository.activeWorkspacesByDay(since),
    ticketAdminRepository.countByStatus(),
  ]);

  const revenueByCurrency = calculateRevenue(subscriptions);
  const topRevenue = revenueByCurrency[0] ?? null;
  const counts = {
    total: workspaces.length,
    active: workspaces.filter((item) => item.workspace.subscriptionStatus === "active").length,
    trial: workspaces.filter((item) => item.workspace.subscriptionStatus === "trial").length,
    suspended: workspaces.filter((item) => item.workspace.subscriptionStatus === "suspended").length,
  };
  const recentSignups = workspaces.slice(0, 5);
  const aiSuccessRate =
    aiSummary.totalRequests === 0 ? null : Math.round((aiSummary.successCount / aiSummary.totalRequests) * 100);
  const openTickets = ticketCounts.open + ticketCounts.in_progress;

  return (
    <PageContainer className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />

      <Section title={t("workspacesHeading")}>
        <StatGrid
          className="sm:grid-cols-5 lg:grid-cols-5"
          stats={[
            { label: t("total"), value: counts.total, icon: Building2 },
            { label: t("active"), value: counts.active, icon: CheckCircle2, tone: "success" },
            { label: t("trial"), value: counts.trial, icon: Clock3 },
            { label: t("suspended"), value: counts.suspended, icon: PauseCircle, tone: "warning" },
            { label: t("openTickets"), value: openTickets, icon: LifeBuoy, href: "/admin/tickets" },
          ]}
        />
      </Section>

      <Section title={t("revenueHeading")}>
        <StatGrid
          className="sm:grid-cols-2 lg:grid-cols-2"
          stats={[
            { label: t("mrr"), value: topRevenue ? formatAmount(topRevenue.mrr, topRevenue.currency) : "—", icon: DollarSign, tone: "success" },
            { label: t("arr"), value: topRevenue ? formatAmount(topRevenue.arr, topRevenue.currency) : "—", icon: TrendingUp, tone: "success" },
          ]}
        />
      </Section>

      <Section title={t("aiHeading")}>
        <StatGrid
          stats={[
            { label: t("aiRequests"), value: aiSummary.totalRequests, icon: Bot },
            { label: t("aiSuccessRate"), value: aiSuccessRate === null ? "—" : `${aiSuccessRate}%`, icon: CheckCircle2, tone: "success" },
            { label: t("aiAvgLatency"), value: t("msValue", { ms: aiSummary.avgLatencyMs }), icon: Gauge },
            { label: t("aiInputTokens"), value: aiSummary.totalInputTokens.toLocaleString("en-US"), icon: Zap },
            { label: t("aiOutputTokens"), value: aiSummary.totalOutputTokens.toLocaleString("en-US"), icon: Zap },
          ]}
        />
      </Section>

      <Section title={t("trendsHeading")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <LineChartCard title={t("dailySignups")} data={toChartData(days, signups)} emptyMessage={t("trendsEmpty")} />
          <LineChartCard
            title={t("activeWorkspacesPerDay")}
            data={toChartData(days, activeWorkspaces)}
            emptyMessage={t("trendsEmpty")}
          />
        </div>
      </Section>

      <Section title={t("recentSignupsHeading")}>
        <RowList
          items={recentSignups}
          getRowKey={({ workspace }) => workspace.id}
          getRowHref={() => "/admin/workspaces"}
          emptyState={{ icon: Building2, title: t("noSignups") }}
          renderRow={({ workspace, ownerEmail }) => (
            <>
              <span className="truncate font-medium">{workspace.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {ownerEmail ?? t("noOwner")} · {new Date(workspace.createdAt).toISOString().slice(0, 10)}
              </span>
            </>
          )}
        />
      </Section>
    </PageContainer>
  );
}
