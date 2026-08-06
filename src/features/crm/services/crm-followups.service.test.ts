import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Lead } from "@/db/schema";

vi.mock("../repository/lead.repository", () => ({
  leadRepository: { findStaleOpenLeads: vi.fn(), markFollowupNotified: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

const { leadRepository } = await import("../repository/lead.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { crmFollowupsService } = await import("./crm-followups.service");

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    workspaceId: "workspace-1",
    contactId: "contact-1",
    conversationId: null,
    stage: "new",
    lastFollowupNotifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    workspaceId: "workspace-1",
    fullName: "Ahmed",
    phone: null,
    whatsappId: null,
    instagramId: null,
    email: null,
    language: "en",
    tags: [],
    notes: null,
    aiSummary: null,
    avatarUrl: null,
    country: null,
    city: null,
    source: null,
    lifecycleStage: "lead",
    assignedAgentId: null,
    lastContactAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crmFollowupsService.runDailyCheck", () => {
  it("notifies and marks each stale lead returned by the repository", async () => {
    vi.mocked(leadRepository.findStaleOpenLeads).mockResolvedValue([
      { lead: makeLead(), contact: makeContact() },
    ]);

    const result = await crmFollowupsService.runDailyCheck();

    expect(result.notified).toBe(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", type: "crm_followup", link: "/dashboard/contacts/contact-1" }),
    );
    expect(leadRepository.markFollowupNotified).toHaveBeenCalledWith("lead-1");
  });

  it("continues past a single lead's failure without throwing", async () => {
    vi.mocked(leadRepository.findStaleOpenLeads).mockResolvedValue([
      { lead: makeLead({ id: "lead-1" }), contact: makeContact() },
      { lead: makeLead({ id: "lead-2" }), contact: makeContact({ id: "contact-2", fullName: "Sara" }) },
    ]);
    vi.mocked(notificationRepository.create).mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce(
      // @ts-expect-error only the call succeeding matters for this test, not the return shape
      undefined,
    );

    const result = await crmFollowupsService.runDailyCheck();

    expect(result.notified).toBe(1);
    expect(leadRepository.markFollowupNotified).toHaveBeenCalledTimes(1);
    expect(leadRepository.markFollowupNotified).toHaveBeenCalledWith("lead-2");
  });

  it("returns zero notified when nothing is stale", async () => {
    vi.mocked(leadRepository.findStaleOpenLeads).mockResolvedValue([]);

    const result = await crmFollowupsService.runDailyCheck();

    expect(result.notified).toBe(0);
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});
