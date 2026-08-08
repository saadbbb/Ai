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
  contactRepository: { findByWorkspaceId: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/email", () => ({
  emailService: { sendNotificationEmail: vi.fn() },
}));

vi.mock("@/features/workspace/repository/workspace-audit-log.repository", () => ({
  workspaceAuditLogRepository: { log: vi.fn() },
}));

vi.mock("@/lib/rate-limit/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

const { campaignRepository } = await import("../repository/campaign.repository");
const { churnRiskRepository } = await import("../repository/churn-risk.repository");
const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { emailService } = await import("@/lib/email");
const { workspaceAuditLogRepository } = await import("@/features/workspace/repository/workspace-audit-log.repository");
const { checkRateLimit } = await import("@/lib/rate-limit/rate-limit");
const { campaignService } = await import("./campaign.service");

const WORKSPACE_ID = "workspace-1";
const ACTOR = { userId: "user-1", email: "owner@example.com" };

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    workspaceId: WORKSPACE_ID,
    name: "Win them back",
    subject: "We miss you",
    message: "Come back!",
    segmentLifecycleStage: null,
    segmentTag: null,
    segmentChurnRisk: false,
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
    marketingOptOut: false,
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

  it("excludes contacts who have opted out of marketing", async () => {
    vi.mocked(contactRepository.findByWorkspaceId).mockResolvedValue([
      makeContact({ id: "opted-in", marketingOptOut: false }),
      makeContact({ id: "opted-out", marketingOptOut: true }),
    ]);

    const result = await campaignService.previewRecipients(WORKSPACE_ID, {});

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("opted-in");
  });

  it("targets only high-churn-risk contacts when segmentChurnRisk is set", async () => {
    const now = Date.now();
    vi.mocked(churnRiskRepository.findCandidates).mockResolvedValue([
      { contact: makeContact({ id: "high-risk", lastContactAt: null }), lastOrderAt: null },
      { contact: makeContact({ id: "low-risk", lastContactAt: new Date(now) }), lastOrderAt: new Date(now) },
    ]);

    const result = await campaignService.previewRecipients(WORKSPACE_ID, { churnRisk: true });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("high-risk");
    expect(contactRepository.findByWorkspaceId).not.toHaveBeenCalled();
  });
});

describe("campaignService.sendCampaign", () => {
  it("throws NOT_FOUND when the campaign doesn't exist", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(null);

    await expect(campaignService.sendCampaign(WORKSPACE_ID, "campaign-1", ACTOR)).rejects.toThrow(/not found/i);
  });

  it("refuses to re-send an already-sent campaign", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(makeCampaign({ status: "sent" }));

    await expect(campaignService.sendCampaign(WORKSPACE_ID, "campaign-1", ACTOR)).rejects.toThrow(/already been sent/i);
  });

  it("refuses to send once the daily rate limit is hit", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(makeCampaign());
    vi.mocked(checkRateLimit).mockResolvedValueOnce(false);

    await expect(campaignService.sendCampaign(WORKSPACE_ID, "campaign-1", ACTOR)).rejects.toThrow(/too many campaigns/i);
    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("emails every recipient with an email, logs an activity each, and marks the campaign sent with the real count", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(makeCampaign());
    vi.mocked(contactRepository.findByWorkspaceId).mockResolvedValue([
      makeContact({ id: "contact-1", email: "a@example.com" }),
      makeContact({ id: "contact-2", email: "b@example.com" }),
    ]);
    vi.mocked(campaignRepository.markSent).mockResolvedValue(makeCampaign({ status: "sent", recipientCount: 2 }));

    const result = await campaignService.sendCampaign(WORKSPACE_ID, "campaign-1", ACTOR);

    expect(emailService.sendNotificationEmail).toHaveBeenCalledTimes(2);
    expect(activityRepository.log).toHaveBeenCalledTimes(2);
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ contactId: "contact-1", type: "campaign_message_sent" }));
    expect(campaignRepository.markSent).toHaveBeenCalledWith("campaign-1", WORKSPACE_ID, 2);
    expect(result.recipientCount).toBe(2);
  });

  it("substitutes {{contactName}} and appends an unsubscribe link", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(makeCampaign({ message: "Hi {{contactName}}, come back!" }));
    vi.mocked(contactRepository.findByWorkspaceId).mockResolvedValue([makeContact({ id: "contact-1", fullName: "Jane" })]);
    vi.mocked(campaignRepository.markSent).mockResolvedValue(makeCampaign({ status: "sent", recipientCount: 1 }));

    await campaignService.sendCampaign(WORKSPACE_ID, "campaign-1", ACTOR);

    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Hi Jane, come back!"),
      }),
    );
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining(`/unsubscribe/${WORKSPACE_ID}/contact-1`) }),
    );
  });

  it("logs a workspace audit entry after sending", async () => {
    vi.mocked(campaignRepository.findById).mockResolvedValue(makeCampaign());
    vi.mocked(contactRepository.findByWorkspaceId).mockResolvedValue([makeContact({ id: "contact-1" })]);
    vi.mocked(campaignRepository.markSent).mockResolvedValue(makeCampaign({ status: "sent", recipientCount: 1 }));

    await campaignService.sendCampaign(WORKSPACE_ID, "campaign-1", ACTOR);

    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, actorUserId: ACTOR.userId, action: "campaign_sent" }),
    );
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

    await campaignService.sendCampaign(WORKSPACE_ID, "campaign-1", ACTOR);

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

describe("campaignService.setMarketingOptOut", () => {
  it("updates the contact's opt-out flag", async () => {
    vi.mocked(contactRepository.update).mockResolvedValue(makeContact({ marketingOptOut: true }));

    await campaignService.setMarketingOptOut(WORKSPACE_ID, "contact-1", true);

    expect(contactRepository.update).toHaveBeenCalledWith("contact-1", WORKSPACE_ID, { marketingOptOut: true });
  });
});
