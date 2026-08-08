import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repository/invoice.repository", () => ({
  invoiceRepository: { findAllPaidBasic: vi.fn(), countByStatusSince: vi.fn() },
}));

vi.mock("../repository/workspace-admin.repository", () => ({
  workspaceAdminRepository: {
    findActiveWithPlan: vi.fn(),
    countCancelledSince: vi.fn(),
    countEverActivated: vi.fn(),
    countAll: vi.fn(),
  },
}));

const { invoiceRepository } = await import("../repository/invoice.repository");
const { workspaceAdminRepository } = await import("../repository/workspace-admin.repository");
const { revenueService } = await import("./revenue.service");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(workspaceAdminRepository.findActiveWithPlan).mockResolvedValue([]);
  vi.mocked(invoiceRepository.findAllPaidBasic).mockResolvedValue([]);
  vi.mocked(workspaceAdminRepository.countCancelledSince).mockResolvedValue(0);
  vi.mocked(workspaceAdminRepository.countEverActivated).mockResolvedValue(0);
  vi.mocked(workspaceAdminRepository.countAll).mockResolvedValue(0);
  vi.mocked(invoiceRepository.countByStatusSince).mockResolvedValue(0);
});

describe("revenueService.getDashboard", () => {
  it("composes ARPU on top of each currency's revenue summary", async () => {
    vi.mocked(workspaceAdminRepository.findActiveWithPlan).mockResolvedValue([
      { planName: "Pro", price: "100.00", billingCycle: "monthly", currency: "USD" },
      { planName: "Pro", price: "100.00", billingCycle: "monthly", currency: "USD" },
    ]);

    const dashboard = await revenueService.getDashboard();

    expect(dashboard.byCurrency).toHaveLength(1);
    expect(dashboard.byCurrency[0]).toMatchObject({ currency: "USD", mrr: 200, arpu: 100 });
  });

  it("computes churn using cancellations against the base at the start of the period", async () => {
    vi.mocked(workspaceAdminRepository.findActiveWithPlan).mockResolvedValue([
      { planName: "Pro", price: "100.00", billingCycle: "monthly", currency: "USD" },
    ]);
    vi.mocked(workspaceAdminRepository.countCancelledSince).mockResolvedValue(1);

    const dashboard = await revenueService.getDashboard();

    // 1 active now + 1 cancelled this period = 2 at the start; 1/2 = 50%
    expect(dashboard.cancellations).toBe(1);
    expect(dashboard.churnRate).toBe(50);
  });

  it("passes through the trial conversion rate and payment failure count", async () => {
    vi.mocked(workspaceAdminRepository.countEverActivated).mockResolvedValue(3);
    vi.mocked(workspaceAdminRepository.countAll).mockResolvedValue(12);
    vi.mocked(invoiceRepository.countByStatusSince).mockResolvedValue(2);

    const dashboard = await revenueService.getDashboard();

    expect(dashboard.trialConversionRate).toBe(25);
    expect(dashboard.paymentFailures).toBe(2);
    expect(invoiceRepository.countByStatusSince).toHaveBeenCalledWith("failed", expect.any(Date));
  });

  it("classifies paid invoices into new subscriptions vs renewals", async () => {
    const periodStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
    vi.mocked(invoiceRepository.findAllPaidBasic).mockResolvedValue([
      { workspaceId: "ws-1", currency: "USD", amount: "100.00", issuedAt: new Date(periodStart - 1000) },
      { workspaceId: "ws-1", currency: "USD", amount: "100.00", issuedAt: new Date() },
      { workspaceId: "ws-2", currency: "USD", amount: "50.00", issuedAt: new Date() },
    ]);

    const dashboard = await revenueService.getDashboard();

    expect(dashboard.newSubscriptions).toBe(1);
    expect(dashboard.renewals).toBe(1);
    expect(dashboard.ltvByCurrency[0]).toMatchObject({ currency: "USD", payingWorkspaceCount: 2, totalRevenue: 250 });
  });
});
