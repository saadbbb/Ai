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
    getAttributionStats: vi.fn(),
  },
}));

const { adAccountRepository } = await import("../repository/ad-account.repository");
const { adCampaignRepository } = await import("../repository/ad-campaign.repository");
const { adsService } = await import("./ads.service");

const WORKSPACE_ID = "workspace-1";

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
    const stats = [{ campaign: { id: "campaign-1" } as AdCampaign, contactCount: 3, revenue: 150 }];
    vi.mocked(adCampaignRepository.getAttributionStats).mockResolvedValue(stats);

    const result = await adsService.getAttributionReport(WORKSPACE_ID);

    expect(adCampaignRepository.getAttributionStats).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(result).toBe(stats);
  });
});
