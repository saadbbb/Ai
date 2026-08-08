import { describe, expect, it } from "vitest";
import {
  calculateArpu,
  calculateChurnRate,
  calculateLtvByCurrency,
  calculateRevenue,
  calculateTrialConversionRate,
  classifyInvoicesInPeriod,
} from "./revenue";

describe("calculateRevenue", () => {
  it("returns an empty list for no active subscriptions", () => {
    expect(calculateRevenue([])).toEqual([]);
  });

  it("sums monthly-plan prices directly into MRR", () => {
    const [result] = calculateRevenue([
      { planName: "Pro", price: "15000.00", billingCycle: "monthly", currency: "IQD" },
      { planName: "Pro", price: "15000.00", billingCycle: "monthly", currency: "IQD" },
    ]);
    expect(result.mrr).toBe(30000);
    expect(result.arr).toBe(360000);
  });

  it("divides a yearly plan's price by 12 for its MRR contribution", () => {
    const [result] = calculateRevenue([
      { planName: "Business", price: "1200000.00", billingCycle: "yearly", currency: "IQD" },
    ]);
    expect(result.mrr).toBe(100000);
  });

  it("excludes unpriced subscriptions from MRR but still counts them as active", () => {
    const [result] = calculateRevenue([
      { planName: "Free Trial", price: null, billingCycle: "monthly", currency: "IQD" },
      { planName: "Pro", price: "15000.00", billingCycle: "monthly", currency: "IQD" },
    ]);
    expect(result.mrr).toBe(15000);
    expect(result.activeSubscriptionCount).toBe(2);
    expect(result.pricedSubscriptionCount).toBe(1);
  });

  it("groups by plan name and sorts by MRR descending", () => {
    const [result] = calculateRevenue([
      { planName: "Starter", price: "5000.00", billingCycle: "monthly", currency: "IQD" },
      { planName: "Business", price: "50000.00", billingCycle: "monthly", currency: "IQD" },
      { planName: "Starter", price: "5000.00", billingCycle: "monthly", currency: "IQD" },
    ]);
    expect(result.byPlan).toEqual([
      { planName: "Business", subscriptionCount: 1, mrr: 50000 },
      { planName: "Starter", subscriptionCount: 2, mrr: 10000 },
    ]);
  });

  it("keeps currencies fully separate rather than blending them into one total", () => {
    const result = calculateRevenue([
      { planName: "Pro", price: "100.00", billingCycle: "monthly", currency: "USD" },
      { planName: "Pro", price: "100.00", billingCycle: "monthly", currency: "USD" },
      { planName: "Basic", price: "15000.00", billingCycle: "monthly", currency: "IQD" },
    ]);

    expect(result).toHaveLength(2);
    const usd = result.find((row) => row.currency === "USD")!;
    const iqd = result.find((row) => row.currency === "IQD")!;
    expect(usd.mrr).toBe(200);
    expect(usd.activeSubscriptionCount).toBe(2);
    expect(iqd.mrr).toBe(15000);
    expect(iqd.activeSubscriptionCount).toBe(1);
  });

  it("sorts currencies by active subscriber count descending", () => {
    const result = calculateRevenue([
      { planName: "Pro", price: "100.00", billingCycle: "monthly", currency: "USD" },
      { planName: "Basic", price: "15000.00", billingCycle: "monthly", currency: "IQD" },
      { planName: "Basic", price: "15000.00", billingCycle: "monthly", currency: "IQD" },
    ]);

    expect(result.map((row) => row.currency)).toEqual(["IQD", "USD"]);
  });
});

describe("classifyInvoicesInPeriod", () => {
  const periodStart = new Date("2026-08-01T00:00:00Z");

  it("counts a workspace's very first invoice as a new subscription", () => {
    const result = classifyInvoicesInPeriod(
      [{ workspaceId: "ws-1", issuedAt: new Date("2026-08-05T00:00:00Z") }],
      periodStart,
    );
    expect(result).toEqual({ newSubscriptions: 1, renewals: 0 });
  });

  it("counts a later invoice for the same workspace as a renewal", () => {
    const result = classifyInvoicesInPeriod(
      [
        { workspaceId: "ws-1", issuedAt: new Date("2026-07-01T00:00:00Z") },
        { workspaceId: "ws-1", issuedAt: new Date("2026-08-05T00:00:00Z") },
      ],
      periodStart,
    );
    expect(result).toEqual({ newSubscriptions: 0, renewals: 1 });
  });

  it("ignores invoices issued before the period", () => {
    const result = classifyInvoicesInPeriod(
      [{ workspaceId: "ws-1", issuedAt: new Date("2026-07-15T00:00:00Z") }],
      periodStart,
    );
    expect(result).toEqual({ newSubscriptions: 0, renewals: 0 });
  });
});

describe("calculateChurnRate", () => {
  it("computes cancellations as a percentage of the starting base", () => {
    expect(calculateChurnRate(5, 100)).toBe(5);
  });

  it("returns 0 when there was no starting base", () => {
    expect(calculateChurnRate(0, 0)).toBe(0);
  });
});

describe("calculateLtvByCurrency", () => {
  it("averages total revenue per distinct paying workspace, grouped by currency", () => {
    const result = calculateLtvByCurrency([
      { workspaceId: "ws-1", currency: "USD", amount: "100.00" },
      { workspaceId: "ws-1", currency: "USD", amount: "100.00" },
      { workspaceId: "ws-2", currency: "USD", amount: "100.00" },
      { workspaceId: "ws-3", currency: "IQD", amount: "50000.00" },
    ]);

    const usd = result.find((row) => row.currency === "USD")!;
    expect(usd.totalRevenue).toBe(300);
    expect(usd.payingWorkspaceCount).toBe(2);
    expect(usd.ltv).toBe(150);
  });
});

describe("calculateArpu", () => {
  it("divides MRR by active subscriber count", () => {
    expect(calculateArpu(1000, 4)).toBe(250);
  });

  it("returns 0 with no active subscribers", () => {
    expect(calculateArpu(0, 0)).toBe(0);
  });
});

describe("calculateTrialConversionRate", () => {
  it("computes the share of workspaces that ever activated a plan", () => {
    expect(calculateTrialConversionRate(25, 100)).toBe(25);
  });

  it("returns 0 with no workspaces at all", () => {
    expect(calculateTrialConversionRate(0, 0)).toBe(0);
  });
});
