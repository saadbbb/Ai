import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Campaign, Contact } from "@/db/schema";

vi.mock("../repository/campaign.repository", () => ({
  campaignRepository: {
    findByWorkspaceId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    markSent: vi.fn(),
  },
}));

vi.mock("../repository/churn-risk.repository", () => ({
  churnRiskRepository: {
    findCandidates: vi.fn(),
  },
}));

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/lib/email", () => ({
  emailService: { sendNotificationEmail: vi.fn() },
}));

const { campaignRepository } = await import("../repository/campaign.repository");
const { churnRiskRepository } = await import("../repository/churn-risk.repository");
const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { emailService } = await import("@/lib/email");
const { campaignService } = await import("./campaign.service");

const WORKSPACE_ID = "workspace-1";

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    workspaceId: WORKSPACE_ID,
    name: "Win them back",
    subject: "We miss you",
    message: "Come back!",
    segmentLifecycleStage: null,
    segmentTag: null,
    status: "draft",
    recipientCount: 0,
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    workspaceId: WORKSPACE_ID,
    fullName: "Jane",
    phone: null,
    whatsappId: null,
    instagramId: null,
    email: "jane@example.com",
    language: null,
    tags: [],
    notes: null,
    aiSummary: null,
    avatarUrl: null,
    country: null,
    city: null,
    source: null,
    lifecycleStage: "customer",
    assignedAgentId: null,
    lastContactAt: null,
    address: null,
    budget: null,
    preferredContactMethod: null,
    preferredProducts: [],
    birthDate: null,
    gender: null,
    timezone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("campaignService.previewRecipients", () => {
  it("excludes contacts without an email address", async () => {
    vi.mocked(contactRepository.findByWorkspaceId).mockResolvedValue([
      makeContact({ id: "with-email", email: "a@example.com" }),
      makeContact({ id: "no-email", email: null }),
    ]);

    const result = await campaignService.previewRecipients(WORKSPACE_ID, {});

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("with-email");
  });
});

describe("campaignService.sendCampaign", () => {
  it("throws NOT_FOUND when the campaign doesn't exist", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(null);

    await expect(campaignService.sendCampaign(WORKSPACE_ID, "campaign-1")).rejects.toThrow(/not found/i);
  });

  it("refuses to re-send an already-sent campaign", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(makeCampaign({ status: "sent" }));

    await expect(campaignService.sendCampaign(WORKSPACE_ID, "campaign-1")).rejects.toThrow(/already been sent/i);
  });

  it("emails every recipient with an email, logs an activity each, and marks the campaign sent with the real count", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(makeCampaign());
    vi.mocked(contactRepository.findByWorkspaceId).mockResolvedValue([
      makeContact({ id: "contact-1", email: "a@example.com" }),
      makeContact({ id: "contact-2", email: "b@example.com" }),
    ]);
    vi.mocked(campaignRepository.markSent).mockResolvedValue(makeCampaign({ status: "sent", recipientCount: 2 }));

    const result = await campaignService.sendCampaign(WORKSPACE_ID, "campaign-1");

    expect(emailService.sendNotificationEmail).toHaveBeenCalledTimes(2);
    expect(activityRepository.log).toHaveBeenCalledTimes(2);
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ contactId: "contact-1", type: "campaign_message_sent" }));
    expect(campaignRepository.markSent).toHaveBeenCalledWith("campaign-1", WORKSPACE_ID, 2);
    expect(result.recipientCount).toBe(2);
  });

  it("keeps sending to the remaining recipients when one email send fails", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(makeCampaign());
    vi.mocked(contactRepository.findByWorkspaceId).mockResolvedValue([
      makeContact({ id: "contact-1", email: "a@example.com" }),
      makeContact({ id: "contact-2", email: "b@example.com" }),
    ]);
    vi.mocked(emailService.sendNotificationEmail)
      .mockRejectedValueOnce(new Error("bounced"))
      .mockResolvedValueOnce(undefined);
    vi.mocked(campaignRepository.markSent).mockResolvedValue(makeCampaign({ status: "sent", recipientCount: 1 }));

    await campaignService.sendCampaign(WORKSPACE_ID, "campaign-1");

    expect(emailService.sendNotificationEmail).toHaveBeenCalledTimes(2);
    expect(campaignRepository.markSent).toHaveBeenCalledWith("campaign-1", WORKSPACE_ID, 1);
  });
});

describe("campaignService.listChurnRisk", () => {
  it("ranks contacts highest-risk-first", async () => {
    const now = Date.now();
    vi.mocked(churnRiskRepository.findCandidates).mockResolvedValue([
      { contact: makeContact({ id: "fresh", lastContactAt: new Date(now) }), lastOrderAt: new Date(now) },
      { contact: makeContact({ id: "stale", lastContactAt: null }), lastOrderAt: null },
    ]);

    const result = await campaignService.listChurnRisk(WORKSPACE_ID);

    expect(result[0].contact.id).toBe("stale");
    expect(result[0].risk.level).toBe("high");
    expect(result[1].contact.id).toBe("fresh");
  });
});
