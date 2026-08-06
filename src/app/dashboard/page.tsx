import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { HealthScoreCard } from "@/features/analytics/components/health-score-card";
import { resolveAnalyticsRange } from "@/features/analytics/lib/date-range";
import { analyticsService } from "@/features/analytics/services/analytics.service";
import { InsightsPanel } from "@/features/ai/components/insights-panel";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { dashboardService, type AttentionItem } from "@/features/dashboard/services/dashboard.service";
import { permissionService } from "@/features/workspace/services/permission.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

const ATTENTION_LABEL_KEY: Record<AttentionItem["type"], "handover" | "coldLead"> = {
  handover: "handover",
  cold_lead: "coldLead",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("dashboard");
  const tLeads = await getTranslations("leads");
  const tAnalytics = await getTranslations("analytics");

  // Today and attention bands share the same authorization requirement (base workspace
  // membership, already verified above). Growth is independently re-verified below since
  // it needs the extra analytics.view permission — see dashboardService.getTodayAndAttentionBands.
  const [{ today, attention, pipelineByStage }, canViewGrowth] = await Promise.all([
    dashboardService.getTodayAndAttentionBands(workspace.id),
    permissionService.hasPermission(user.id, workspace.id, "analytics.view"),
  ]);

  const growth = canViewGrowth ? await analyticsService.getSummary(workspace.id, resolveAnalyticsRange(undefined)) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("welcomeBack")}</h1>
        <p className="text-muted-foreground">{t("signedInAs", { email: user.email })}</p>
      </div>

      <InsightsPanel />

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t("bands.today.heading")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label={t("bands.today.conversations")} value={today.conversationsToday} />
          <StatTile label={t("bands.today.newLeads")} value={today.newLeadsToday} />
          <StatTile label={t("bands.today.orders")} value={today.ordersToday} />
          <StatTile label={t("bands.today.appointments")} value={today.appointmentsToday} />
          <StatTile label={t("bands.today.revenue")} value={today.revenueToday.toFixed(2)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t("bands.attention.heading")}</h2>
        <div className="divide-y rounded-lg border">
          {attention.items.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t("bands.attention.empty")}</p>}
          {attention.items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.href}
              className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted"
            >
              <span className="truncate">{t(`bands.attention.${ATTENTION_LABEL_KEY[item.type]}`, { name: item.label })}</span>
            </Link>
          ))}
        </div>
      </section>

      {growth && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">{t("bands.growing.heading")}</h2>
            <p className="text-xs text-muted-foreground">{t("bands.growing.subheading")}</p>
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
              }}
            />

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatTile label={t("bands.growing.revenue")} value={growth.kpis.revenueTotal.toFixed(2)} />
                <StatTile label={t("bands.growing.ordersCompleted")} value={growth.kpis.ordersCompleted} />
                <StatTile label={t("bands.growing.appointmentsCompleted")} value={growth.kpis.appointmentsCompleted} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">{t("bands.growing.pipelineHeading")}</h3>
                <div className="divide-y rounded-lg border">
                  {pipelineByStage
                    .filter(({ count }) => count > 0)
                    .map(({ stage, count }) => (
                      <div key={stage} className="flex items-center justify-between p-2.5 text-sm">
                        <span>{tLeads(`stages.${stage}`)}</span>
                        <span className="text-muted-foreground">{count}</span>
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
    </div>
  );
}
