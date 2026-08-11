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
  TrendingUp,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CoachMark } from "@/components/coach-mark";
import { HealthScoreCard } from "@/features/analytics/components/health-score-card";
import { resolveAnalyticsRange } from "@/features/analytics/lib/date-range";
import { analyticsService } from "@/features/analytics/services/analytics.service";
import { InsightsPanel } from "@/features/ai/components/insights-panel";
import { StatTile } from "@/features/dashboard/components/stat-tile";
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
  const t = await getTranslations("dashboard");
  const tLeads = await getTranslations("leads");
  const tAnalytics = await getTranslations("analytics");
  const tChannel = await getTranslations("inbox.thread.channel");
  const tCoach = await getTranslations("coachMarks.attention");
  const tBilling = await getTranslations("billing");

  // Today and attention bands share the same authorization requirement (base workspace
  // membership, already verified above). Growth is independently re-verified below since
  // it needs the extra analytics.view permission — see dashboardService.getTodayAndAttentionBands.
  const [{ today, attention, pipelineByStage }, canViewGrowth, roleKey] = await Promise.all([
    dashboardService.getTodayAndAttentionBands(workspace.id),
    permissionService.hasPermission(user.id, workspace.id, "analytics.view"),
    membershipRepository.findRoleKeyByUserAndWorkspace(user.id, workspace.id),
  ]);

  const isIndividualContributor = roleKey !== null && INDIVIDUAL_CONTRIBUTOR_ROLES.has(roleKey);
  const myWork = isIndividualContributor ? await dashboardService.getMyWorkBand(workspace.id, user.id) : null;

  const growth = canViewGrowth ? await analyticsService.getSummary(workspace.id, resolveAnalyticsRange(undefined)) : null;

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
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">{t("welcomeBack")}</h1>
        <p className="text-text-secondary">{t("signedInAs", { email: user.email })}</p>
      </div>

      <InsightsPanel />

      {myWork ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("bands.myWork.heading")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label={t("bands.myWork.assignedConversations")} value={myWork.assignedConversationsCount} />
            <StatTile label={t("bands.myWork.assignedTasks")} value={myWork.assignedOpenTasksCount} />
            <StatTile label={t("bands.today.appointments")} value={myWork.appointmentsToday} />
          </div>
          {myWork.assignedConversations.length > 0 && (
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {myWork.assignedConversations.map((item) => (
                <Link key={item.id} href={item.href} className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted">
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("bands.today.heading")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label={t("bands.today.conversations")} value={today.conversationsToday} icon={MessageSquare} />
            <StatTile label={t("bands.today.newLeads")} value={today.newLeadsToday} icon={UserPlus} />
            <StatTile label={t("bands.today.orders")} value={today.ordersToday} icon={ListChecks} />
            <StatTile label={t("bands.today.appointments")} value={today.appointmentsToday} icon={CalendarCheck} />
            <StatTile label={t("bands.today.revenue")} value={today.revenueToday.toFixed(2)} icon={DollarSign} tone="success" />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("bands.attention.heading")}</h2>
        <CoachMark id="dashboard-attention" title={tCoach("title")} description={tCoach("description")} />
        {attention.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
            <Inbox className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("bands.attention.empty")}</p>
          </div>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
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
      </section>

      {growth && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("bands.growing.heading")}</h2>
              <p className="text-xs text-muted-foreground">{t("bands.growing.subheading")}</p>
            </div>
          </div>

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
              <div className="grid grid-cols-3 gap-3">
                <StatTile label={t("bands.growing.revenue")} value={growth.kpis.revenueTotal.toFixed(2)} icon={DollarSign} tone="success" />
                <StatTile label={t("bands.growing.ordersCompleted")} value={growth.kpis.ordersCompleted} icon={ListChecks} />
                <StatTile label={t("bands.growing.appointmentsCompleted")} value={growth.kpis.appointmentsCompleted} icon={CalendarCheck} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">{t("bands.growing.pipelineHeading")}</h3>
                <div className="divide-y overflow-hidden rounded-xl border bg-card">
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
        </section>
      )}

      {isOwner && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("bands.business.heading")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label={t("bands.business.subscriptionStatus")}
              value={tBilling(`statuses.${workspace.subscriptionStatus}`)}
              icon={Building2}
            />
            <StatTile label={t("bands.business.plan")} value={plan?.name ?? t("bands.business.noPlan")} icon={Award} />
            <StatTile
              label={t("bands.business.topChannel")}
              value={topChannel ? tChannel(topChannel.status) : "—"}
              icon={MessageSquare}
            />
            <StatTile label={t("bands.business.topProduct")} value={topProduct?.productName ?? "—"} />
            <StatTile label={t("bands.business.topAgent")} value={topAgent?.email ?? "—"} />
          </div>
        </section>
      )}
    </div>
  );
}
