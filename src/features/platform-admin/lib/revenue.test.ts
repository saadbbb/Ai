import { describe, expect, it } from "vitest";
import { calculateRevenue } from "./revenue";

describe("calculateRevenue", () => {
  it("returns zeroes for no active subscriptions", () => {
    const result = calculateRevenue([]);
    expect(result).toEqual({ mrr: 0, arr: 0, activeSubscriptionCount: 0, pricedSubscriptionCount: 0, byPlan: [] });
  });

  it("sums monthly-plan prices directly into MRR", () => {
    const result = calculateRevenue([
      { planName: "Pro", price: "15000.00", billingCycle: "monthly" },
      { planName: "Pro", price: "15000.00", billingCycle: "monthly" },
    ]);
    expect(result.mrr).toBe(30000);
    expect(result.arr).toBe(360000);
  });

  it("divides a yearly plan's price by 12 for its MRR contribution", () => {
    const result = calculateRevenue([{ planName: "Business", price: "1200000.00", billingCycle: "yearly" }]);
    expect(result.mrr).toBe(100000);
  });

  it("excludes unpriced subscriptions from MRR but still counts them as active", () => {
    const result = calculateRevenue([
      { planName: "Free Trial", price: null, billingCycle: "monthly" },
      { planName: "Pro", price: "15000.00", billingCycle: "monthly" },
    ]);
    expect(result.mrr).toBe(15000);
    expect(result.activeSubscriptionCount).toBe(2);
    expect(result.pricedSubscriptionCount).toBe(1);
  });

  it("groups by plan name and sorts by MRR descending", () => {
    const result = calculateRevenue([
      { planName: "Starter", price: "5000.00", billingCycle: "monthly" },
      { planName: "Business", price: "50000.00", billingCycle: "monthly" },
      { planName: "Starter", price: "5000.00", billingCycle: "monthly" },
    ]);
    expect(result.byPlan).toEqual([
      { planName: "Business", subscriptionCount: 1, mrr: 50000 },
      { planName: "Starter", subscriptionCount: 2, mrr: 10000 },
    ]);
  });
});
