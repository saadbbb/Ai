import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

const ACTIVITY_HREF_LABEL_KEY = {
  conversation: "activityNewConversation",
  lead: "activityNewLead",
  order: "activityNewOrder",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("dashboard");
  const tLeads = await getTranslations("leads");

  const summary = await dashboardService.getSummary(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("welcomeBack")}</h1>
        <p className="text-muted-foreground">{t("signedInAs", { email: user.email })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("stats.conversationsToday")} value={summary.conversationsToday} />
        <StatTile label={t("stats.newLeadsToday")} value={summary.newLeadsToday} />
        <StatTile label={t("stats.activePipeline")} value={summary.activePipelineCount} />
        <StatTile label={t("stats.activeOrders")} value={summary.activeOrdersCount} />
        <StatTile label={t("stats.revenue")} value={summary.revenueTotal.toFixed(2)} />
        <StatTile label={t("stats.aiActive")} value={summary.aiActiveCount} />
        <StatTile label={t("stats.needsHuman")} value={summary.needsHumanCount} />
        <StatTile label={t("stats.aiRequestsToday")} value={summary.aiRequestsToday} />
        <StatTile label={t("stats.totalContacts")} value={summary.totalContacts} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("pipelineHeading")}</h2>
          <div className="divide-y rounded-lg border">
            {summary.pipelineByStage
              .filter(({ count }) => count > 0)
              .map(({ stage, count }) => (
                <div key={stage} className="flex items-center justify-between p-3 text-sm">
                  <span>{tLeads(`stages.${stage}`)}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
            {summary.pipelineByStage.every(({ count }) => count === 0) && (
              <p className="p-3 text-sm text-muted-foreground">{t("noActivity")}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("recentActivityHeading")}</h2>
          <div className="divide-y rounded-lg border">
            {summary.recentActivity.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t("noActivity")}</p>}
            {summary.recentActivity.map((activity) => (
              <Link
                key={`${activity.type}-${activity.id}`}
                href={activity.href}
                className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted"
              >
                <span className="truncate">{t(ACTIVITY_HREF_LABEL_KEY[activity.type], { name: activity.label })}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
