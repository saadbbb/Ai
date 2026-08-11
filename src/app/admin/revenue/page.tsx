import { AlertTriangle, DollarSign, Percent, RotateCcw, TrendingDown, TrendingUp, UserPlus, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RowList } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ExportButtons } from "@/components/export-buttons";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { StatGrid } from "@/components/stat-grid";
import { revenueService } from "@/features/platform-admin/services/revenue.service";

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}

export default async function AdminRevenuePage() {
  const [t, tCommon] = await Promise.all([
    getTranslations("platformAdmin.revenue"),
    getTranslations("common"),
  ]);
  const dashboard = await revenueService.getDashboard();
  const exportLabels = { csv: tCommon("exportCsv"), excel: tCommon("exportExcel"), pdf: tCommon("exportPdf") };

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("reports.subscriptions")}</span>
          <ExportButtons reportPath="/api/admin/reports/billing?type=subscriptions" labels={exportLabels} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("reports.invoices")}</span>
          <ExportButtons reportPath="/api/admin/reports/billing?type=invoices" labels={exportLabels} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("reports.refunds")}</span>
          <ExportButtons reportPath="/api/admin/reports/billing?type=refunds" labels={exportLabels} />
        </div>
      </div>

      <StatGrid
        stats={[
          { label: t("newSubscriptions", { days: dashboard.periodDays }), value: dashboard.newSubscriptions, icon: UserPlus, tone: "success" },
          { label: t("renewals", { days: dashboard.periodDays }), value: dashboard.renewals, icon: RotateCcw },
          { label: t("cancellations", { days: dashboard.periodDays }), value: dashboard.cancellations, icon: TrendingDown, tone: "warning" },
          { label: t("churnRate"), value: `${dashboard.churnRate}%`, icon: Percent, tone: "warning" },
          { label: t("trialConversionRate"), value: `${dashboard.trialConversionRate}%`, icon: TrendingUp, tone: "success" },
          { label: t("paymentFailures", { days: dashboard.periodDays }), value: dashboard.paymentFailures, icon: AlertTriangle, tone: "warning" },
        ]}
      />

      {dashboard.byCurrency.length === 0 ? (
        <EmptyState icon={DollarSign} title={t("emptyState")} />
      ) : (
        <div className="space-y-6">
          {dashboard.byCurrency.map((summary) => {
            const ltv = dashboard.ltvByCurrency.find((row) => row.currency === summary.currency);
            const unpriced = summary.activeSubscriptionCount - summary.pricedSubscriptionCount;

            return (
              <div key={summary.currency} className="space-y-3 rounded-xl border bg-card shadow-sm p-4">
                <h2 className="text-sm font-semibold text-foreground">{summary.currency}</h2>
                <StatGrid
                  stats={[
                    { label: t("mrr"), value: formatAmount(summary.mrr, summary.currency), icon: DollarSign, tone: "success" },
                    { label: t("arr"), value: formatAmount(summary.arr, summary.currency), icon: TrendingUp, tone: "success" },
                    { label: t("arpu"), value: formatAmount(summary.arpu, summary.currency), icon: DollarSign },
                    { label: t("ltv"), value: formatAmount(ltv?.ltv ?? 0, summary.currency), icon: DollarSign },
                    { label: t("activeSubscriptions"), value: summary.activeSubscriptionCount, icon: Users },
                    { label: t("unpriced"), value: unpriced, icon: AlertTriangle, tone: "warning" },
                  ]}
                />
                {unpriced > 0 && <p className="text-sm text-muted-foreground">{t("unpricedHint")}</p>}

                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground">{t("byPlanHeading")}</h3>
                  <RowList
                    items={summary.byPlan}
                    getRowKey={(row) => row.planName}
                    emptyState={{ icon: DollarSign, title: t("emptyState") }}
                    renderRow={(row) => (
                      <>
                        <span className="truncate font-medium">{row.planName}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {t("planSubscriptions", { count: row.subscriptionCount })} · {formatAmount(row.mrr, summary.currency)}
                        </span>
                      </>
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
