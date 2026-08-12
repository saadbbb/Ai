import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdAccount, AdCampaign } from "@/db/schema";

vi.mock("../repository/ad-account.repository", () => ({
  adAccountRepository: {
    findByWorkspaceId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../repository/ad-campaign.repository", () => ({
  adCampaignRepository: {
    findByWorkspaceId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    updateSpend: vi.fn(),
    getAttributionStats: vi.fn(),
  },
}));

vi.mock("@/features/workspace/repository/workspace-audit-log.repository", () => ({
  workspaceAuditLogRepository: { log: vi.fn() },
}));

vi.mock("@/features/ai/repository/ai-usage.repository", () => ({
  aiUsageRepository: { create: vi.fn() },
}));

vi.mock("@/features/ai/router/ai-router", () => ({
  DEFAULT_MODEL: "claude-haiku-4-5",
  selectProvider: vi.fn(),
}));

const { adAccountRepository } = await import("../repository/ad-account.repository");
const { adCampaignRepository } = await import("../repository/ad-campaign.repository");
const { workspaceAuditLogRepository } = await import("@/features/workspace/repository/workspace-audit-log.repository");
const { selectProvider } = await import("@/features/ai/router/ai-router");
const { adsService } = await import("./ads.service");

const WORKSPACE_ID = "workspace-1";
const ACTOR = { userId: "user-1", name: null, email: "owner@example.com" };

function makeAttributionStat(overrides: Partial<{ contactCount: number; revenue: number; spend: number | null; cpl: number | null; roas: number | null }> = {}) {
  return {
    campaign: { id: "campaign-1", name: "Summer Sale" } as AdCampaign,
    contactCount: 3,
    revenue: 150,
    spend: null,
    cpl: null,
    roas: null,
    ...overrides,
  };
}

function mockProviderText(text: string) {
  const generateReply = vi.fn().mockResolvedValue({
    text,
    stopReason: "end_turn",
    needsHumanHandover: false,
    usage: { inputTokens: 10, outputTokens: 10 },
  });
  vi.mocked(selectProvider).mockReturnValue({ generateReply } as never);
  return generateReply;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adsService.getOrCreateAdAccount", () => {
  it("returns the existing account without creating a new one", async () => {
    const existing = { id: "account-1" } as AdAccount;
    vi.mocked(adAccountRepository.findByWorkspaceId).mockResolvedValue(existing);

    const result = await adsService.getOrCreateAdAccount(WORKSPACE_ID);

    expect(result).toBe(existing);
    expect(adAccountRepository.create).not.toHaveBeenCalled();
  });

  it("creates a not_connected account on first visit", async () => {
    vi.mocked(adAccountRepository.findByWorkspaceId).mockResolvedValue(null);
    const created = { id: "account-1", status: "not_connected" } as AdAccount;
    vi.mocked(adAccountRepository.create).mockResolvedValue(created);

    const result = await adsService.getOrCreateAdAccount(WORKSPACE_ID);

    expect(adAccountRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, provider: "meta", status: "not_connected" }),
    );
    expect(result).toBe(created);
  });
});

describe("adsService.updateCampaignStatus", () => {
  it("throws NOT_FOUND when the campaign doesn't belong to this workspace", async () => {
    vi.mocked(adCampaignRepository.updateStatus).mockResolvedValue(null);

    await expect(adsService.updateCampaignStatus(WORKSPACE_ID, "campaign-1", "paused")).rejects.toThrow(/not found/i);
  });

  it("returns the updated campaign", async () => {
    const updated = { id: "campaign-1", status: "paused" } as AdCampaign;
    vi.mocked(adCampaignRepository.updateStatus).mockResolvedValue(updated);

    const result = await adsService.updateCampaignStatus(WORKSPACE_ID, "campaign-1", "paused");

    expect(result).toBe(updated);
  });
});

describe("adsService.getAttributionReport", () => {
  it("delegates straight to the repository's attribution query", async () => {
    const stats = [makeAttributionStat()];
    vi.mocked(adCampaignRepository.getAttributionStats).mockResolvedValue(stats);

    const result = await adsService.getAttributionReport(WORKSPACE_ID);

    expect(adCampaignRepository.getAttributionStats).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(result).toBe(stats);
  });
});

describe("adsService.createCampaign", () => {
  it("logs a workspace audit entry after creating", async () => {
    const created = { id: "campaign-1", name: "Summer Sale" } as AdCampaign;
    vi.mocked(adCampaignRepository.create).mockResolvedValue(created);

    const result = await adsService.createCampaign(WORKSPACE_ID, { name: "Summer Sale", utmCampaign: "summer-sale" }, ACTOR);

    expect(result).toBe(created);
    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, actorUserId: ACTOR.userId, action: "ad_campaign_created" }),
    );
  });
});

describe("adsService.updateCampaignSpend", () => {
  it("throws NOT_FOUND when the campaign doesn't belong to this workspace", async () => {
    vi.mocked(adCampaignRepository.updateSpend).mockResolvedValue(null);

    await expect(adsService.updateCampaignSpend(WORKSPACE_ID, "campaign-1", 100)).rejects.toThrow(/not found/i);
  });

  it("returns the updated campaign", async () => {
    const updated = { id: "campaign-1", actualSpend: "100.00" } as AdCampaign;
    vi.mocked(adCampaignRepository.updateSpend).mockResolvedValue(updated);

    const result = await adsService.updateCampaignSpend(WORKSPACE_ID, "campaign-1", 100);

    expect(adCampaignRepository.updateSpend).toHaveBeenCalledWith("campaign-1", WORKSPACE_ID, 100);
    expect(result).toBe(updated);
  });
});

describe("adsService.generateAdInsights", () => {
  it("refuses to generate insights with no campaigns logged", async () => {
    vi.mocked(adCampaignRepository.getAttributionStats).mockResolvedValue([]);

    await expect(adsService.generateAdInsights(WORKSPACE_ID)).rejects.toThrow(/log at least one/i);
  });

  it("returns the model's text response", async () => {
    vi.mocked(adCampaignRepository.getAttributionStats).mockResolvedValue([makeAttributionStat({ spend: 50, cpl: 16.67, roas: 3 })]);
    mockProviderText("Summer Sale is your best performer with a 3x ROAS — consider increasing its budget.");

    const result = await adsService.generateAdInsights(WORKSPACE_ID);

    expect(result).toContain("Summer Sale");
  });
});
