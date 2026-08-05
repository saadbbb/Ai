import { getTranslations } from "next-intl/server";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { calculateRevenue } from "@/features/platform-admin/lib/revenue";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";

function formatIqd(amount: number): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} IQD`;
}

export default async function AdminRevenuePage() {
  const t = await getTranslations("platformAdmin.revenue");

  const subscriptions = await workspaceAdminRepository.findActiveWithPlan();
  const summary = calculateRevenue(subscriptions);
  const unpricedCount = summary.activeSubscriptionCount - summary.pricedSubscriptionCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("mrr")} value={formatIqd(summary.mrr)} />
        <StatTile label={t("arr")} value={formatIqd(summary.arr)} />
        <StatTile label={t("activeSubscriptions")} value={summary.activeSubscriptionCount} />
        <StatTile label={t("unpriced")} value={unpricedCount} />
      </div>

      {unpricedCount > 0 && <p className="text-sm text-muted-foreground">{t("unpricedHint")}</p>}

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("byPlanHeading")}</h2>
        {summary.byPlan.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("emptyState")}
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {summary.byPlan.map((row) => (
              <div key={row.planName} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span className="truncate font-medium">{row.planName}</span>
                <span className="shrink-0 text-muted-foreground">
                  {t("planSubscriptions", { count: row.subscriptionCount })} · {formatIqd(row.mrr)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
