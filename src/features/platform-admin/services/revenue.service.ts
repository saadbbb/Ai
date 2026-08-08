import { invoiceRepository } from "../repository/invoice.repository";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";
import {
  calculateArpu,
  calculateChurnRate,
  calculateLtvByCurrency,
  calculateRevenue,
  calculateTrialConversionRate,
  classifyInvoicesInPeriod,
  type CurrencyLtv,
  type CurrencyRevenueSummary,
} from "../lib/revenue";

const PERIOD_DAYS = 30;

export interface CurrencyRevenueDepth extends CurrencyRevenueSummary {
  arpu: number;
}

export interface RevenueDashboard {
  byCurrency: CurrencyRevenueDepth[];
  ltvByCurrency: CurrencyLtv[];
  newSubscriptions: number;
  renewals: number;
  cancellations: number;
  churnRate: number;
  trialConversionRate: number;
  paymentFailures: number;
  periodDays: number;
}

export const revenueService = {
  async getDashboard(): Promise<RevenueDashboard> {
    const periodStart = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const [activeSubscriptions, paidInvoices, cancellations, everActivatedCount, totalWorkspaceCount, paymentFailures] =
      await Promise.all([
        workspaceAdminRepository.findActiveWithPlan(),
        invoiceRepository.findAllPaidBasic(),
        workspaceAdminRepository.countCancelledSince(periodStart),
        workspaceAdminRepository.countEverActivated(),
        workspaceAdminRepository.countAll(),
        invoiceRepository.countByStatusSince("failed", periodStart),
      ]);

    const revenueByCurrency = calculateRevenue(activeSubscriptions);
    const byCurrency = revenueByCurrency.map((summary) => ({
      ...summary,
      arpu: calculateArpu(summary.mrr, summary.activeSubscriptionCount),
    }));

    const { newSubscriptions, renewals } = classifyInvoicesInPeriod(paidInvoices, periodStart);
    const activeAtStart = activeSubscriptions.length + cancellations;

    return {
      byCurrency,
      ltvByCurrency: calculateLtvByCurrency(paidInvoices),
      newSubscriptions,
      renewals,
      cancellations,
      churnRate: calculateChurnRate(cancellations, activeAtStart),
      trialConversionRate: calculateTrialConversionRate(everActivatedCount, totalWorkspaceCount),
      paymentFailures,
      periodDays: PERIOD_DAYS,
    };
  },
};
