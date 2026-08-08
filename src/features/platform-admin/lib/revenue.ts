import type { BillingCycle, Currency } from "@/db/schema";

export interface RevenueSubscription {
  planName: string;
  price: string | null;
  billingCycle: BillingCycle;
  currency: Currency;
}

export interface PlanRevenueBreakdown {
  planName: string;
  subscriptionCount: number;
  mrr: number;
}

export interface CurrencyRevenueSummary {
  currency: Currency;
  mrr: number;
  arr: number;
  activeSubscriptionCount: number;
  /** Active subscriptions actually contributing to MRR — the rest are on an unpriced plan. */
  pricedSubscriptionCount: number;
  byPlan: PlanRevenueBreakdown[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A yearly plan's price is annual — divide by 12 to get its monthly contribution. */
function monthlyValue(sub: RevenueSubscription): number {
  if (!sub.price) return 0;
  const price = Number(sub.price);
  return sub.billingCycle === "yearly" ? price / 12 : price;
}

/**
 * Grouped by currency, never blended — plans can now be priced in different
 * currencies (see plans.currency / PART 8's Multi-Currency section), and
 * summing raw numbers across them would produce a meaningless total (an IQD
 * figure is on the order of 1000x the same value in USD). Sorted by active
 * subscriber count descending so the platform's primary currency surfaces first.
 */
export function calculateRevenue(subscriptions: RevenueSubscription[]): CurrencyRevenueSummary[] {
  const byCurrency = new Map<Currency, RevenueSubscription[]>();
  for (const sub of subscriptions) {
    const list = byCurrency.get(sub.currency) ?? [];
    list.push(sub);
    byCurrency.set(sub.currency, list);
  }

  const summaries = [...byCurrency.entries()].map(([currency, subs]) => {
    const byPlanMap = new Map<string, { count: number; mrr: number }>();
    let mrr = 0;
    let pricedCount = 0;

    for (const sub of subs) {
      const monthly = monthlyValue(sub);
      if (sub.price) pricedCount += 1;
      mrr += monthly;

      const existing = byPlanMap.get(sub.planName) ?? { count: 0, mrr: 0 };
      byPlanMap.set(sub.planName, { count: existing.count + 1, mrr: existing.mrr + monthly });
    }

    const byPlan = [...byPlanMap.entries()]
      .map(([planName, { count, mrr: planMrr }]) => ({
        planName,
        subscriptionCount: count,
        mrr: round2(planMrr),
      }))
      .sort((a, b) => b.mrr - a.mrr);

    const summary: CurrencyRevenueSummary = {
      currency,
      mrr: round2(mrr),
      arr: round2(mrr * 12),
      activeSubscriptionCount: subs.length,
      pricedSubscriptionCount: pricedCount,
      byPlan,
    };
    return summary;
  });

  return summaries.sort((a, b) => b.activeSubscriptionCount - a.activeSubscriptionCount);
}

export interface SubscriptionEventBreakdown {
  newSubscriptions: number;
  renewals: number;
}

/**
 * Classifies every paid invoice issued on/after periodStart as "new" (a
 * workspace's first-ever paid invoice) or "renewal" (any later one) —
 * there's no separate subscription-event log (see DEFERRED_TASKS.md's
 * manual-billing note), so an invoice's position in its workspace's own
 * history is the only signal available.
 */
export function classifyInvoicesInPeriod(
  allPaidInvoices: { workspaceId: string; issuedAt: Date }[],
  periodStart: Date,
): SubscriptionEventBreakdown {
  const firstInvoiceTime = new Map<string, number>();
  for (const invoice of allPaidInvoices) {
    const time = invoice.issuedAt.getTime();
    const existing = firstInvoiceTime.get(invoice.workspaceId);
    if (existing === undefined || time < existing) firstInvoiceTime.set(invoice.workspaceId, time);
  }

  let newSubscriptions = 0;
  let renewals = 0;
  for (const invoice of allPaidInvoices) {
    if (invoice.issuedAt.getTime() < periodStart.getTime()) continue;
    if (firstInvoiceTime.get(invoice.workspaceId) === invoice.issuedAt.getTime()) {
      newSubscriptions += 1;
    } else {
      renewals += 1;
    }
  }
  return { newSubscriptions, renewals };
}

/** Cancellations as a share of the subscriber base at the start of the period. */
export function calculateChurnRate(cancellations: number, activeAtStart: number): number {
  if (activeAtStart <= 0) return 0;
  return round2((cancellations / activeAtStart) * 100);
}

export interface CurrencyLtv {
  currency: Currency;
  totalRevenue: number;
  payingWorkspaceCount: number;
  /** Lifetime revenue collected per paying workspace so far — a historical average, not a predictive model. */
  ltv: number;
}

/** Grouped by currency for the same reason calculateRevenue() is — see its comment. */
export function calculateLtvByCurrency(paidInvoices: { workspaceId: string; currency: Currency; amount: string }[]): CurrencyLtv[] {
  const byCurrency = new Map<Currency, { total: number; workspaces: Set<string> }>();
  for (const invoice of paidInvoices) {
    const entry = byCurrency.get(invoice.currency) ?? { total: 0, workspaces: new Set<string>() };
    entry.total += Number(invoice.amount);
    entry.workspaces.add(invoice.workspaceId);
    byCurrency.set(invoice.currency, entry);
  }

  return [...byCurrency.entries()]
    .map(([currency, { total, workspaces }]) => ({
      currency,
      totalRevenue: round2(total),
      payingWorkspaceCount: workspaces.size,
      ltv: workspaces.size === 0 ? 0 : round2(total / workspaces.size),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/** ARPU for a single currency's active subscriber base — simple MRR / active count. */
export function calculateArpu(mrr: number, activeSubscriptionCount: number): number {
  if (activeSubscriptionCount <= 0) return 0;
  return round2(mrr / activeSubscriptionCount);
}

/** Share of every workspace ever created that has activated a paid plan at least once. */
export function calculateTrialConversionRate(everActivatedCount: number, totalWorkspaceCount: number): number {
  if (totalWorkspaceCount <= 0) return 0;
  return round2((everActivatedCount / totalWorkspaceCount) * 100);
}
