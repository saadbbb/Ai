import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { calculateRevenue } from "@/features/platform-admin/lib/revenue";
import { aiUsageAdminRepository } from "@/features/platform-admin/repository/ai-usage-admin.repository";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

function formatIqd(amount: number): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} IQD`;
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

  const [workspaces, subscriptions, aiSummary] = await Promise.all([
    workspaceAdminRepository.findAllWithOwner(),
    workspaceAdminRepository.findActiveWithPlan(),
    aiUsageAdminRepository.getSummary(),
  ]);

  const revenue = calculateRevenue(subscriptions);
  const counts = {
    total: workspaces.length,
    active: workspaces.filter((item) => item.workspace.subscriptionStatus === "active").length,
    trial: workspaces.filter((item) => item.workspace.subscriptionStatus === "trial").length,
    suspended: workspaces.filter((item) => item.workspace.subscriptionStatus === "suspended").length,
  };
  const recentSignups = workspaces.slice(0, 5);
  const aiSuccessRate =
    aiSummary.totalRequests === 0 ? null : Math.round((aiSummary.successCount / aiSummary.totalRequests) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t("workspacesHeading")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t("total")} value={counts.total} />
          <StatTile label={t("active")} value={counts.active} />
          <StatTile label={t("trial")} value={counts.trial} />
          <StatTile label={t("suspended")} value={counts.suspended} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t("revenueHeading")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <StatTile label={t("mrr")} value={formatIqd(revenue.mrr)} />
          <StatTile label={t("arr")} value={formatIqd(revenue.arr)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t("aiHeading")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label={t("aiRequests")} value={aiSummary.totalRequests} />
          <StatTile label={t("aiSuccessRate")} value={aiSuccessRate === null ? "—" : `${aiSuccessRate}%`} />
          <StatTile label={t("aiAvgLatency")} value={t("msValue", { ms: aiSummary.avgLatencyMs })} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t("recentSignupsHeading")}</h2>
        {recentSignups.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("noSignups")}
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {recentSignups.map(({ workspace, ownerEmail }) => (
              <Link
                key={workspace.id}
                href="/admin/workspaces"
                className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted"
              >
                <span className="truncate font-medium">{workspace.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {ownerEmail ?? t("noOwner")} · {new Date(workspace.createdAt).toISOString().slice(0, 10)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
