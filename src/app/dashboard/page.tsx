import {
  Award,
  Building2,
  CalendarCheck,
  DollarSign,
  Flame,
  Inbox,
  ListChecks,
  MessageSquare,
  Snowflake,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CoachMark } from "@/components/coach-mark";
import { PageContainer, Section } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { HealthScoreCard } from "@/features/analytics/components/health-score-card";
import { resolveAnalyticsRange } from "@/features/analytics/lib/date-range";
import { analyticsService } from "@/features/analytics/services/analytics.service";
import { InsightsPanel } from "@/features/ai/components/insights-panel";
import { StatGrid } from "@/components/stat-grid";
import { dashboardService, type AttentionItem } from "@/features/dashboard/services/dashboard.service";
import { planRepository } from "@/features/platform-admin/repository/plan.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { permissionService } from "@/features/workspace/services/permission.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { cn } from "@/lib/utils";

const ATTENTION_LABEL_KEY: Record<AttentionItem["type"], "handover" | "coldLead" | "hotLead"> = {
  handover: "handover",
  cold_lead: "coldLead",
  hot_lead: "hotLead",
};

const ATTENTION_STYLE: Record<AttentionItem["type"], { icon: typeof Flame; tone: string }> = {
  handover: { icon: UserCheck, tone: "bg-info-soft text-info" },
  cold_lead: { icon: Snowflake, tone: "bg-muted text-muted-foreground" },
  hot_lead: { icon: Flame, tone: "bg-error-soft text-error" },
};

/** Roles that see the narrower "My Work" band instead of the workspace-wide Today band — see PART 7's Agent Dashboard. */
const INDIVIDUAL_CONTRIBUTOR_ROLES = new Set(["agent", "viewer"]);

export default async function DashboardPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const [t, tLeads, tAnalytics, tChannel, tCoach, tBilling] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("leads"),
    getTranslations("analytics"),
    getTranslations("inbox.thread.channel"),
    getTranslations("coachMarks.attention"),
    getTranslations("billing"),
  ]);

  // Today and attention bands share the same authorization requirement (base workspace
  // membership, already verified above). Growth is independently re-verified below since
  // it needs the extra analytics.view permission — see dashboardService.getTodayAndAttentionBands.
  const [{ today, attention, pipelineByStage }, canViewGrowth, roleKey] = await Promise.all([
    dashboardService.getTodayAndAttentionBands(workspace.id),
    permissionService.hasPermission(user.id, workspace.id, "analytics.view"),
    membershipRepository.findRoleKeyByUserAndWorkspace(user.id, workspace.id),
  ]);

  const isIndividualContributor = roleKey !== null && INDIVIDUAL_CONTRIBUTOR_ROLES.has(roleKey);
  const [myWork, growth] = await Promise.all([
    isIndividualContributor ? dashboardService.getMyWorkBand(workspace.id, user.id) : Promise.resolve(null),
    canViewGrowth ? analyticsService.getSummary(workspace.id, resolveAnalyticsRange(undefined)) : Promise.resolve(null),
  ]);

  // PART 7 gap: Owner/Admin/Manager saw an identical dashboard — this "Business"
  // band (subscription health + top performers) is Owner-only, the one piece of
  // context the other management roles don't need day-to-day.
  const isOwner = roleKey === "owner";
  const [plan, teamPerformance] = await Promise.all([
    isOwner && workspace.planId ? planRepository.findById(workspace.planId) : Promise.resolve(null),
    isOwner ? analyticsService.getTeamPerformance(workspace.id, resolveAnalyticsRange(undefined)) : Promise.resolve([]),
  ]);
  const topChannel = growth
    ? [...growth.conversationsByChannel].filter((row) => row.count > 0).sort((a, b) => b.count - a.count)[0]
    : undefined;
  const topProduct = growth?.revenueByProduct[0];
  const topAgent = teamPerformance.length > 0 ? teamPerformance[0] : undefined;

  return (
    <PageContainer>
      <PageHeader title={t("welcomeBack")} description={t("signedInAs", { email: user.name ?? user.email ?? user.phone ?? "" })} />

      <InsightsPanel />

      {myWork ? (
        <Section title={t("bands.myWork.heading")}>
          <StatGrid
            className="sm:grid-cols-3 lg:grid-cols-3"
            stats={[
              { label: t("bands.myWork.assignedConversations"), value: myWork.assignedConversationsCount },
              { label: t("bands.myWork.assignedTasks"), value: myWork.assignedOpenTasksCount },
              { label: t("bands.today.appointments"), value: myWork.appointmentsToday },
            ]}
          />
          {myWork.assignedConversations.length > 0 && (
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
              {myWork.assignedConversations.map((item) => (
                <Link key={item.id} href={item.href} className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted">
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </Section>
      ) : (
        <Section title={t("bands.today.heading")}>
          <StatGrid
            className="sm:grid-cols-5 lg:grid-cols-5"
            stats={[
              { label: t("bands.today.conversations"), value: today.conversationsToday, icon: MessageSquare },
              { label: t("bands.today.newLeads"), value: today.newLeadsToday, icon: UserPlus },
              { label: t("bands.today.orders"), value: today.ordersToday, icon: ListChecks },
              { label: t("bands.today.appointments"), value: today.appointmentsToday, icon: CalendarCheck },
              { label: t("bands.today.revenue"), value: today.revenueToday.toFixed(2), icon: DollarSign, tone: "success" },
            ]}
          />
        </Section>
      )}

      <Section title={t("bands.attention.heading")}>
        <CoachMark id="dashboard-attention" title={tCoach("title")} description={tCoach("description")} />
        {attention.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
            <Inbox className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("bands.attention.empty")}</p>
          </div>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border border-warning/40 bg-card shadow-sm">
            {attention.items.map((item) => {
              const style = ATTENTION_STYLE[item.type];
              const Icon = style.icon;
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="flex items-center gap-3 p-3 text-sm hover:bg-muted"
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", style.tone)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="truncate">{t(`bands.attention.${ATTENTION_LABEL_KEY[item.type]}`, { name: item.label })}</span>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {growth && (
        <Section title={t("bands.growing.heading")} description={t("bands.growing.subheading")}>
          <div className="grid gap-6 md:grid-cols-2">
            <HealthScoreCard
              healthScore={growth.healthScore}
              title={tAnalytics("healthScore.title")}
              noDataMessage={tAnalytics("healthScore.noData")}
              levelLabels={{
                excellent: tAnalytics("healthScore.levels.excellent"),
                good: tAnalytics("healthScore.levels.good"),
                needs_attention: tAnalytics("healthScore.levels.needs_attention"),
                critical: tAnalytics("healthScore.levels.critical"),
              }}
              breakdownLabels={{
                leadConversion: tAnalytics("healthScore.breakdown.leadConversion"),
                orderCompletion: tAnalytics("healthScore.breakdown.orderCompletion"),
                appointmentCompletion: tAnalytics("healthScore.breakdown.appointmentCompletion"),
                aiSuccess: tAnalytics("healthScore.breakdown.aiSuccess"),
                responseTime: tAnalytics("healthScore.breakdown.responseTime"),
                missedConversations: tAnalytics("healthScore.breakdown.missedConversations"),
                automationSuccess: tAnalytics("healthScore.breakdown.automationSuccess"),
                revenueTrend: tAnalytics("healthScore.breakdown.revenueTrend"),
              }}
            />

            <div className="space-y-4">
              <StatGrid
                className="grid-cols-1 sm:grid-cols-3"
                stats={[
                  { label: t("bands.growing.revenue"), value: growth.kpis.revenueTotal.toFixed(2), icon: DollarSign, tone: "success" },
                  { label: t("bands.growing.ordersCompleted"), value: growth.kpis.ordersCompleted, icon: ListChecks },
                  { label: t("bands.growing.appointmentsCompleted"), value: growth.kpis.appointmentsCompleted, icon: CalendarCheck },
                ]}
              />

              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">{t("bands.growing.pipelineHeading")}</h3>
                <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
                  {pipelineByStage
                    .filter(({ count }) => count > 0)
                    .map(({ stage, count }) => (
                      <div key={stage} className="flex items-center justify-between p-2.5 text-sm">
                        <span>{tLeads(`stages.${stage}`)}</span>
                        <span className="font-medium tabular-nums text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  {pipelineByStage.every(({ count }) => count === 0) && (
                    <p className="p-2.5 text-sm text-muted-foreground">{t("bands.growing.pipelineEmpty")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {isOwner && (
        <Section title={t("bands.business.heading")}>
          <StatGrid
            className="sm:grid-cols-4 lg:grid-cols-4"
            stats={[
              {
                label: t("bands.business.subscriptionStatus"),
                value: tBilling(`statuses.${workspace.subscriptionStatus}`),
                icon: Building2,
              },
              { label: t("bands.business.plan"), value: plan?.name ?? t("bands.business.noPlan"), icon: Award },
              {
                label: t("bands.business.topChannel"),
                value: topChannel ? tChannel(topChannel.status) : "—",
                icon: MessageSquare,
              },
              { label: t("bands.business.topProduct"), value: topProduct?.productName ?? "—" },
              { label: t("bands.business.topAgent"), value: topAgent?.name ?? topAgent?.email ?? "—" },
            ]}
          />
        </Section>
      )}
    </PageContainer>
  );
}
