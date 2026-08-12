import { Percent, UserCheck, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { BarChartCard } from "@/features/analytics/components/bar-chart-card";
import { StatGrid } from "@/components/stat-grid";
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
  const [byBusinessType, byChannel, retention] = await Promise.all([
    workspaceAdminRepository.countByBusinessType(),
    workspaceAdminRepository.countConnectedChannelsByType(),
    workspaceAdminRepository.retentionStats(since),
  ]);

  const retentionRate = retention.cohortSize === 0 ? null : Math.round((retention.stillActiveCount / retention.cohortSize) * 100);

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />

      <StatGrid
        className="sm:grid-cols-3 lg:grid-cols-3"
        stats={[
          { label: t("retentionCohort", { days: RETENTION_COHORT_DAYS }), value: retention.cohortSize, icon: Users },
          { label: t("retentionStillActive"), value: retention.stillActiveCount, icon: UserCheck, tone: "success" },
          { label: t("retentionRate"), value: retentionRate === null ? "—" : `${retentionRate}%`, icon: Percent, tone: "success" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t("topIndustries")}
          data={byBusinessType.map((row) => ({ label: row.businessType, value: row.count }))}
          emptyMessage={t("empty")}
        />
        <BarChartCard
          title={t("channelUsage")}
          data={byChannel.map((row) => ({ label: tChannel(row.channelType), value: row.count }))}
          emptyMessage={t("empty")}
        />
      </div>
    </PageContainer>
  );
}
