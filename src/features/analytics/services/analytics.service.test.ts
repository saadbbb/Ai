import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsRange } from "../lib/date-range";

vi.mock("../repository/analytics.repository", () => ({
  analyticsRepository: {
    leadsCreatedByDay: vi.fn(),
    revenueByDay: vi.fn(),
    ordersByStatus: vi.fn(),
    appointmentsByStatus: vi.fn(),
    leadsByStage: vi.fn(),
    conversationsByChannel: vi.fn(),
    aiUsageInRange: vi.fn(),
    revenueByProduct: vi.fn(),
    conversationsByAgent: vi.fn(),
    tasksCompletedByAgent: vi.fn(),
    avgFirstResponseSecondsByAgent: vi.fn(),
    leadsByChannel: vi.fn(),
    avgFirstResponseSecondsBySenderType: vi.fn(),
    conversationHandoverStats: vi.fn(),
    automationStats: vi.fn(),
    messagesCreatedByDay: vi.fn(),
    repeatCustomerStats: vi.fn(),
    appointmentsByDay: vi.fn(),
    avgAppointmentLeadTimeSeconds: vi.fn(),
    topServicesByAppointmentCount: vi.fn(),
    revenueByChannel: vi.fn(),
    newVsReturningCustomers: vi.fn(),
  },
}));

vi.mock("@/features/workspace/repository/membership.repository", () => ({
  membershipRepository: {
    findMembersByWorkspaceId: vi.fn(),
  },
}));

const { analyticsRepository } = await import("../repository/analytics.repository");
const { membershipRepository } = await import("@/features/workspace/repository/membership.repository");
const { analyticsService } = await import("./analytics.service");

const RANGE: AnalyticsRange = {
  key: "30d",
  from: new Date("2026-02-14T00:00:00.000Z"),
  to: new Date("2026-03-15T00:00:00.000Z"),
  days: ["2026-03-14", "2026-03-15"],
};

function mockAllEmpty() {
  vi.mocked(analyticsRepository.leadsCreatedByDay).mockResolvedValue([]);
  vi.mocked(analyticsRepository.revenueByDay).mockResolvedValue([]);
  vi.mocked(analyticsRepository.ordersByStatus).mockResolvedValue([]);
  vi.mocked(analyticsRepository.appointmentsByStatus).mockResolvedValue([]);
  vi.mocked(analyticsRepository.leadsByStage).mockResolvedValue([]);
  vi.mocked(analyticsRepository.conversationsByChannel).mockResolvedValue([]);
  vi.mocked(analyticsRepository.aiUsageInRange).mockResolvedValue({ totalRequests: 0, successCount: 0 });
  vi.mocked(analyticsRepository.revenueByProduct).mockResolvedValue([]);
  vi.mocked(analyticsRepository.conversationsByAgent).mockResolvedValue([]);
  vi.mocked(analyticsRepository.tasksCompletedByAgent).mockResolvedValue([]);
  vi.mocked(analyticsRepository.avgFirstResponseSecondsByAgent).mockResolvedValue([]);
  vi.mocked(analyticsRepository.leadsByChannel).mockResolvedValue([]);
  vi.mocked(analyticsRepository.avgFirstResponseSecondsBySenderType).mockResolvedValue([]);
  vi.mocked(analyticsRepository.conversationHandoverStats).mockResolvedValue({ total: 0, handedOver: 0 });
  vi.mocked(analyticsRepository.automationStats).mockResolvedValue({ total: 0, successCount: 0 });
  vi.mocked(analyticsRepository.messagesCreatedByDay).mockResolvedValue([]);
  vi.mocked(analyticsRepository.repeatCustomerStats).mockResolvedValue({ totalCustomers: 0, repeatCustomers: 0 });
  vi.mocked(analyticsRepository.appointmentsByDay).mockResolvedValue([]);
  vi.mocked(analyticsRepository.avgAppointmentLeadTimeSeconds).mockResolvedValue(null);
  vi.mocked(analyticsRepository.topServicesByAppointmentCount).mockResolvedValue([]);
  vi.mocked(analyticsRepository.revenueByChannel).mockResolvedValue([]);
  vi.mocked(analyticsRepository.newVsReturningCustomers).mockResolvedValue({ newCustomers: 0, returningCustomers: 0 });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("analyticsService.getSummary — health score", () => {
  it("returns a null score (not zero) when no sub-rate has any data", async () => {
    mockAllEmpty();

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.healthScore.score).toBeNull();
    expect(summary.healthScore.level).toBeNull();
    expect(summary.healthScore.breakdown.every((item) => item.rate === null)).toBe(true);
    expect(summary.kpis.aiSuccessRate).toBeNull();
  });

  it("averages only the sub-rates that have data, ignoring the ones with no denominator", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.ordersByStatus).mockResolvedValue([
      { status: "delivered", count: 3 },
      { status: "completed", count: 1 },
    ]);
    vi.mocked(analyticsRepository.aiUsageInRange).mockResolvedValue({ totalRequests: 10, successCount: 8 });
    // leadsByStage and appointmentsByStatus stay empty -> those two sub-rates stay null

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    const leadConversion = summary.healthScore.breakdown.find((item) => item.key === "leadConversion");
    const appointmentCompletion = summary.healthScore.breakdown.find((item) => item.key === "appointmentCompletion");
    const orderCompletion = summary.healthScore.breakdown.find((item) => item.key === "orderCompletion");
    const aiSuccess = summary.healthScore.breakdown.find((item) => item.key === "aiSuccess");

    expect(leadConversion?.rate).toBeNull();
    expect(appointmentCompletion?.rate).toBeNull();
    expect(orderCompletion?.rate).toBe(1); // 4 completed/delivered out of 4 non-draft
    expect(aiSuccess?.rate).toBe(0.8);

    // average of [1.0, 0.8] = 0.9 -> 90 -> "excellent" (>= 80)
    expect(summary.healthScore.score).toBe(90);
    expect(summary.healthScore.level).toBe("excellent");
  });

  it("excludes draft orders from the completion-rate denominator", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.ordersByStatus).mockResolvedValue([
      { status: "draft", count: 5 },
      { status: "completed", count: 1 },
    ]);

    const summary = await analyticsService.getSummary("workspace-1", RANGE);
    const orderCompletion = summary.healthScore.breakdown.find((item) => item.key === "orderCompletion");

    // 1 completed / 1 non-draft (draft excluded) = 1.0, not 1/6
    expect(orderCompletion?.rate).toBe(1);
  });
});

describe("analyticsService.getSummary — kpis", () => {
  it("sums leadsByDay and revenueByDay into the kpi totals", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.leadsCreatedByDay).mockResolvedValue([
      { day: "2026-03-14", value: 2 },
      { day: "2026-03-15", value: 3 },
    ]);
    vi.mocked(analyticsRepository.revenueByDay).mockResolvedValue([{ day: "2026-03-15", value: 150.5 }]);

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.kpis.newLeads).toBe(5);
    expect(summary.kpis.revenueTotal).toBe(150.5);
  });

  it("fills day gaps with 0 for days with no rows", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.leadsCreatedByDay).mockResolvedValue([{ day: "2026-03-15", value: 4 }]);

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.leadsByDay).toEqual([
      { day: "2026-03-14", value: 0 },
      { day: "2026-03-15", value: 4 },
    ]);
  });
});

describe("analyticsService.getSummary — depth metrics", () => {
  it("computes average order value from revenue and completed orders", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.revenueByDay).mockResolvedValue([{ day: "2026-03-15", value: 400 }]);
    vi.mocked(analyticsRepository.ordersByStatus).mockResolvedValue([{ status: "completed", count: 4 }]);

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.sales.avgOrderValue).toBe(100);
  });

  it("computes sales growth against the equal-length prior period", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.revenueByDay).mockImplementation(async (_ws, from) => {
      // The prior-period call uses a `from` before the current range's `from`.
      return from.getTime() < RANGE.from.getTime() ? [{ day: "prev", value: 100 }] : [{ day: "cur", value: 150 }];
    });

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.sales.growthPercent).toBe(50);
  });

  it("maps AI vs human response times from the sender-type breakdown", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.avgFirstResponseSecondsBySenderType).mockResolvedValue([
      { senderType: "ai", avgSeconds: 30, replyCount: 10 },
      { senderType: "agent", avgSeconds: 600, replyCount: 5 },
    ]);

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.conversations.avgResponseSecondsAi).toBe(30);
    expect(summary.conversations.avgResponseSecondsHuman).toBe(600);
  });

  it("derives the AI handoff rate and win rate from raw counts", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.conversationHandoverStats).mockResolvedValue({ total: 10, handedOver: 3 });
    vi.mocked(analyticsRepository.leadsByStage).mockResolvedValue([
      { status: "won", count: 3 },
      { status: "lost", count: 1 },
    ]);

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.ai.handoffRate).toBe(0.3);
    expect(summary.leads.winRate).toBe(0.75);
  });

  it("converts appointment lead time from seconds to hours", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.avgAppointmentLeadTimeSeconds).mockResolvedValue(7200);

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.appointments.avgLeadTimeHours).toBe(2);
  });

  it("passes through new vs returning customer counts", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.newVsReturningCustomers).mockResolvedValue({ newCustomers: 4, returningCustomers: 2 });

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.customers).toEqual({ newCount: 4, returningCount: 2 });
  });

  it("folds response time, missed-conversation, automation, and revenue-trend rates into the health score", async () => {
    mockAllEmpty();
    vi.mocked(analyticsRepository.avgFirstResponseSecondsBySenderType).mockResolvedValue([
      { senderType: "agent", avgSeconds: 300, replyCount: 1 }, // <= fast threshold -> rate 1
    ]);
    vi.mocked(analyticsRepository.conversationHandoverStats).mockResolvedValue({ total: 10, handedOver: 0 }); // rate 1 (inverted)
    vi.mocked(analyticsRepository.automationStats).mockResolvedValue({ total: 5, successCount: 5 }); // rate 1
    vi.mocked(analyticsRepository.revenueByDay).mockResolvedValue([]); // current 0, previous 0 -> null (no baseline)

    const summary = await analyticsService.getSummary("workspace-1", RANGE);

    expect(summary.healthScore.breakdown.find((item) => item.key === "responseTime")?.rate).toBe(1);
    expect(summary.healthScore.breakdown.find((item) => item.key === "missedConversations")?.rate).toBe(1);
    expect(summary.healthScore.breakdown.find((item) => item.key === "automationSuccess")?.rate).toBe(1);
    expect(summary.healthScore.breakdown.find((item) => item.key === "revenueTrend")?.rate).toBeNull();
    expect(summary.healthScore.score).toBe(100);
  });
});

describe("analyticsService.getTeamPerformance", () => {
  function member(userId: string, email: string) {
    return { member: { userId } as never, user: { id: userId, email } as never, role: {} as never };
  }

  it("includes every workspace member, defaulting missing metrics to zero/null", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      member("user-1", "agent1@example.com"),
      member("user-2", "agent2@example.com"),
    ]);
    vi.mocked(analyticsRepository.conversationsByAgent).mockResolvedValue([{ userId: "user-1", count: 5 }]);
    vi.mocked(analyticsRepository.tasksCompletedByAgent).mockResolvedValue([{ userId: "user-1", count: 2 }]);
    vi.mocked(analyticsRepository.avgFirstResponseSecondsByAgent).mockResolvedValue([
      { userId: "user-1", avgSeconds: 180, replyCount: 5 },
    ]);

    const rows = await analyticsService.getTeamPerformance("workspace-1", RANGE);

    expect(rows).toEqual([
      { userId: "user-1", email: "agent1@example.com", conversationsHandled: 5, tasksCompleted: 2, avgResponseMinutes: 3 },
      { userId: "user-2", email: "agent2@example.com", conversationsHandled: 0, tasksCompleted: 0, avgResponseMinutes: null },
    ]);
  });

  it("sorts members by conversations handled, descending", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      member("user-1", "low@example.com"),
      member("user-2", "high@example.com"),
    ]);
    vi.mocked(analyticsRepository.conversationsByAgent).mockResolvedValue([
      { userId: "user-1", count: 1 },
      { userId: "user-2", count: 9 },
    ]);

    const rows = await analyticsService.getTeamPerformance("workspace-1", RANGE);

    expect(rows.map((row) => row.userId)).toEqual(["user-2", "user-1"]);
  });
});
