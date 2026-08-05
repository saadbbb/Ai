import type { BillingCycle } from "@/db/schema";

export interface RevenueSubscription {
  planName: string;
  price: string | null;
  billingCycle: BillingCycle;
}

export interface PlanRevenueBreakdown {
  planName: string;
  subscriptionCount: number;
  mrr: number;
}

export interface RevenueSummary {
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

export function calculateRevenue(subscriptions: RevenueSubscription[]): RevenueSummary {
  const byPlanMap = new Map<string, { count: number; mrr: number }>();
  let mrr = 0;
  let pricedCount = 0;

  for (const sub of subscriptions) {
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

  return {
    mrr: round2(mrr),
    arr: round2(mrr * 12),
    activeSubscriptionCount: subscriptions.length,
    pricedSubscriptionCount: pricedCount,
    byPlan,
  };
}
