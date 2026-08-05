import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummary } from "@/features/dashboard/services/dashboard.service";

vi.mock("@/features/dashboard/services/dashboard.service", () => ({
  dashboardService: { getSummary: vi.fn() },
}));

vi.mock("../repository/insights.repository", () => ({
  insightsRepository: { findByWorkspaceId: vi.fn(), upsert: vi.fn() },
}));

vi.mock("../router/ai-router", () => ({
  selectProvider: vi.fn(),
}));

const { dashboardService } = await import("@/features/dashboard/services/dashboard.service");
const { insightsRepository } = await import("../repository/insights.repository");
const { selectProvider } = await import("../router/ai-router");
const { insightsService } = await import("./insights.service");

const WORKSPACE_ID = "workspace-1";

const SUMMARY: DashboardSummary = {
  conversationsToday: 3,
  newLeadsToday: 1,
  activePipelineCount: 5,
  activeOrdersCount: 2,
  revenueTotal: 100,
  aiActiveCount: 4,
  needsHumanCount: 1,
  aiRequestsToday: 20,
  totalContacts: 30,
  pipelineByStage: [],
  recentActivity: [],
};

function mockProvider(text: string) {
  const generateReply = vi.fn().mockResolvedValue({
    text,
    stopReason: "end_turn",
    needsHumanHandover: false,
    usage: { inputTokens: 10, outputTokens: 10 },
  });
  vi.mocked(selectProvider).mockReturnValue({ generateReply });
  return generateReply;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dashboardService.getSummary).mockResolvedValue(SUMMARY);
});

describe("insightsService.getInsights", () => {
  it("returns cached insights without calling the AI provider when they're fresh", async () => {
    vi.mocked(insightsRepository.findByWorkspaceId).mockResolvedValue({
      workspaceId: WORKSPACE_ID,
      insights: ["Cached insight."],
      generatedAt: new Date(),
    });
    const generateReply = mockProvider("New insight.");

    const result = await insightsService.getInsights(WORKSPACE_ID);

    expect(result).toEqual({ insights: ["Cached insight."], generatedAt: expect.any(Date), unavailable: false });
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("regenerates when the cache is older than 24 hours", async () => {
    vi.mocked(insightsRepository.findByWorkspaceId).mockResolvedValue({
      workspaceId: WORKSPACE_ID,
      insights: ["Stale insight."],
      generatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    mockProvider("Fresh insight.");
    vi.mocked(insightsRepository.upsert).mockResolvedValue({
      workspaceId: WORKSPACE_ID,
      insights: ["Fresh insight."],
      generatedAt: new Date(),
    });

    const result = await insightsService.getInsights(WORKSPACE_ID);

    expect(result.insights).toEqual(["Fresh insight."]);
    expect(insightsRepository.upsert).toHaveBeenCalledWith(WORKSPACE_ID, ["Fresh insight."]);
  });

  it("regenerates on forceRefresh even when the cache is still fresh", async () => {
    vi.mocked(insightsRepository.findByWorkspaceId).mockResolvedValue({
      workspaceId: WORKSPACE_ID,
      insights: ["Cached insight."],
      generatedAt: new Date(),
    });
    const generateReply = mockProvider("Forced refresh insight.");
    vi.mocked(insightsRepository.upsert).mockResolvedValue({
      workspaceId: WORKSPACE_ID,
      insights: ["Forced refresh insight."],
      generatedAt: new Date(),
    });

    const result = await insightsService.getInsights(WORKSPACE_ID, true);

    expect(generateReply).toHaveBeenCalledTimes(1);
    expect(result.insights).toEqual(["Forced refresh insight."]);
  });

  it("strips bullet/number prefixes and caps at 4 insights", async () => {
    vi.mocked(insightsRepository.findByWorkspaceId).mockResolvedValue(null);
    mockProvider("- First.\n2) Second.\n* Third.\nFourth.\nFifth (should be dropped).");
    vi.mocked(insightsRepository.upsert).mockImplementation(async (workspaceId, insights) => ({
      workspaceId,
      insights,
      generatedAt: new Date(),
    }));

    const result = await insightsService.getInsights(WORKSPACE_ID);

    expect(result.insights).toEqual(["First.", "Second.", "Third.", "Fourth."]);
  });

  it("falls back to cached insights when regeneration fails", async () => {
    vi.mocked(insightsRepository.findByWorkspaceId).mockResolvedValue({
      workspaceId: WORKSPACE_ID,
      insights: ["Old but usable."],
      generatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    vi.mocked(selectProvider).mockReturnValue({
      generateReply: vi.fn().mockRejectedValue(new Error("ANTHROPIC_API_KEY not set")),
    });

    const result = await insightsService.getInsights(WORKSPACE_ID);

    expect(result).toEqual({ insights: ["Old but usable."], generatedAt: expect.any(Date), unavailable: false });
  });

  it("reports unavailable when generation fails and nothing was ever cached", async () => {
    vi.mocked(insightsRepository.findByWorkspaceId).mockResolvedValue(null);
    vi.mocked(selectProvider).mockReturnValue({
      generateReply: vi.fn().mockRejectedValue(new Error("ANTHROPIC_API_KEY not set")),
    });

    const result = await insightsService.getInsights(WORKSPACE_ID);

    expect(result).toEqual({ insights: [], generatedAt: null, unavailable: true });
  });
});
