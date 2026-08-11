import { Percent, UserCheck, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { BarChartCard } from "@/features/analytics/components/bar-chart-card";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { workspaceAdminRepository } from "@/features/platform-admin/repository/workspace-admin.repository";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

const RETENTION_COHORT_DAYS = 30;

export default async function AdminPlatformAnalyticsPage() {
  await requirePlatformAdmin();
  const [t, tChannel] = await Promise.all([
    getTranslations("platformAdmin.platformAnalytics"),
    getTranslations("inbox.thread.channel"),
  ]);

  const since = new Date(Date.now() - RETENTION_COHORT_DAYS * 24 * 60 * 60 * 1000);
  const [byBusinessType, byCountry, byChannel, retention] = await Promise.all([
    workspaceAdminRepository.countByBusinessType(),
    workspaceAdminRepository.countByCountry(),
    workspaceAdminRepository.countConnectedChannelsByType(),
    workspaceAdminRepository.retentionStats(since),
  ]);

  const retentionRate = retention.cohortSize === 0 ? null : Math.round((retention.stillActiveCount / retention.cohortSize) * 100);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={t("retentionCohort", { days: RETENTION_COHORT_DAYS })} value={retention.cohortSize} icon={Users} />
        <StatTile label={t("retentionStillActive")} value={retention.stillActiveCount} icon={UserCheck} tone="success" />
        <StatTile
          label={t("retentionRate")}
          value={retentionRate === null ? "—" : `${retentionRate}%`}
          icon={Percent}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t("topIndustries")}
          data={byBusinessType.map((row) => ({ label: row.businessType, value: row.count }))}
          emptyMessage={t("empty")}
        />
        <BarChartCard
          title={t("geographicDistribution")}
          data={byCountry.map((row) => ({ label: row.country, value: row.count }))}
          emptyMessage={t("empty")}
        />
        <BarChartCard
          title={t("channelUsage")}
          data={byChannel.map((row) => ({ label: tChannel(row.channelType), value: row.count }))}
          emptyMessage={t("empty")}
        />
      </div>
    </div>
  );
}
