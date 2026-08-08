import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Lead } from "@/db/schema";
import type { ConversationListItem } from "@/features/inbox/repository/conversation.repository";

vi.mock("@/features/automation/services/automation.service", () => ({
  automationService: { dispatch: vi.fn() },
}));

vi.mock("@/features/inbox/repository/conversation.repository", () => ({
  conversationRepository: { findById: vi.fn() },
}));

vi.mock("@/features/inbox/repository/message.repository", () => ({
  messageRepository: { countByConversationIds: vi.fn() },
}));

vi.mock("@/features/orders/repository/order.repository", () => ({
  orderRepository: { findContactIdsWithOrders: vi.fn() },
}));

vi.mock("@/features/appointments/repository/appointment.repository", () => ({
  appointmentRepository: { findContactIdsWithAppointments: vi.fn() },
}));

vi.mock("../repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("../repository/lead.repository", () => ({
  leadRepository: {
    findByConversationId: vi.fn(),
    findByWorkspaceId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStage: vi.fn(),
  },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findById: vi.fn(), updateLifecycleStage: vi.fn(), addTag: vi.fn(), removeTag: vi.fn() },
}));

const { automationService } = await import("@/features/automation/services/automation.service");
const { conversationRepository } = await import("@/features/inbox/repository/conversation.repository");
const { messageRepository } = await import("@/features/inbox/repository/message.repository");
const { orderRepository } = await import("@/features/orders/repository/order.repository");
const { appointmentRepository } = await import("@/features/appointments/repository/appointment.repository");
const { activityRepository } = await import("../repository/activity.repository");
const { leadRepository } = await import("../repository/lead.repository");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { crmService } = await import("./crm.service");

const WORKSPACE_ID = "workspace-1";
const CONVERSATION_ID = "conversation-1";
const CONTACT_ID = "contact-1";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    workspaceId: WORKSPACE_ID,
    contactId: CONTACT_ID,
    conversationId: CONVERSATION_ID,
    stage: "new",
    lastFollowupNotifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    workspaceId: WORKSPACE_ID,
    fullName: "Jane Customer",
    phone: null,
    whatsappId: null,
    instagramId: null,
    email: null,
    language: null,
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

describe("crmService.createLeadFromConversation", () => {
  it("does not log an activity when a lead already exists for the conversation", async () => {
    vi.mocked(leadRepository.findByConversationId).mockResolvedValue(makeLead());

    const lead = await crmService.createLeadFromConversation(WORKSPACE_ID, CONVERSATION_ID, { type: "human", userId: "user-1" });

    expect(lead.id).toBe("lead-1");
    expect(leadRepository.create).not.toHaveBeenCalled();
    expect(activityRepository.log).not.toHaveBeenCalled();
  });

  it("creates a lead, dispatches automation, and logs a timeline entry attributed to the real actor", async () => {
    vi.mocked(leadRepository.findByConversationId).mockResolvedValue(null);
    vi.mocked(conversationRepository.findById).mockResolvedValue({
      contact: { id: CONTACT_ID },
    } as unknown as ConversationListItem);
    vi.mocked(leadRepository.create).mockResolvedValue(makeLead());

    const lead = await crmService.createLeadFromConversation(WORKSPACE_ID, CONVERSATION_ID, { type: "ai" });

    expect(lead.id).toBe("lead-1");
    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID, type: "lead_created", actor: { type: "ai" } }),
    );
  });
});

describe("crmService.updateLeadStage", () => {
  it("logs the new stage with the human actor who made the change", async () => {
    vi.mocked(leadRepository.findById).mockResolvedValue(makeLead({ stage: "negotiation" }));
    vi.mocked(leadRepository.updateStage).mockResolvedValue(makeLead({ stage: "won" }));

    await crmService.updateLeadStage(WORKSPACE_ID, "lead-1", "won", { type: "human", userId: "user-1" });

    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: CONTACT_ID,
        type: "lead_stage_changed",
        actor: { type: "human", userId: "user-1" },
      }),
    );
  });

  it("throws NOT_FOUND when the lead doesn't exist in this workspace", async () => {
    vi.mocked(leadRepository.findById).mockResolvedValue(null);

    await expect(crmService.updateLeadStage(WORKSPACE_ID, "missing-lead", "won", { type: "human", userId: "user-1" })).rejects.toThrow(
      "Lead not found.",
    );
    expect(leadRepository.updateStage).not.toHaveBeenCalled();
  });

  it("rejects reopening a closed lead (state machine guard)", async () => {
    vi.mocked(leadRepository.findById).mockResolvedValue(makeLead({ stage: "won" }));

    await expect(crmService.updateLeadStage(WORKSPACE_ID, "lead-1", "new", { type: "human", userId: "user-1" })).rejects.toThrow(
      'A lead can\'t move from "won" to "new".',
    );
    expect(leadRepository.updateStage).not.toHaveBeenCalled();
  });
});

describe("crmService.listLeads", () => {
  it("returns an empty array without querying signal repositories when there are no leads", async () => {
    vi.mocked(leadRepository.findByWorkspaceId).mockResolvedValue([]);

    const result = await crmService.listLeads(WORKSPACE_ID);

    expect(result).toEqual([]);
    expect(messageRepository.countByConversationIds).not.toHaveBeenCalled();
  });

  it("attaches a score computed from the batched signal lookups, keyed correctly per lead", async () => {
    vi.mocked(leadRepository.findByWorkspaceId).mockResolvedValue([
      { lead: makeLead({ id: "lead-1", contactId: "contact-1", conversationId: "conv-1" }), contact: makeContact({ id: "contact-1" }) },
      { lead: makeLead({ id: "lead-2", contactId: "contact-2", conversationId: "conv-2" }), contact: makeContact({ id: "contact-2" }) },
    ]);
    vi.mocked(messageRepository.countByConversationIds).mockResolvedValue(new Map([["conv-1", 5]]));
    vi.mocked(orderRepository.findContactIdsWithOrders).mockResolvedValue(new Set(["contact-1"]));
    vi.mocked(appointmentRepository.findContactIdsWithAppointments).mockResolvedValue(new Set());

    const result = await crmService.listLeads(WORKSPACE_ID);

    expect(result[0].score).toBeGreaterThan(result[1].score);
    expect(result[1].score).toBe(0);
    expect(messageRepository.countByConversationIds).toHaveBeenCalledWith(["conv-1", "conv-2"]);
    expect(orderRepository.findContactIdsWithOrders).toHaveBeenCalledWith(WORKSPACE_ID, ["contact-1", "contact-2"]);
  });

  it("treats a lead with no linked conversation as zero messages instead of throwing", async () => {
    vi.mocked(leadRepository.findByWorkspaceId).mockResolvedValue([
      { lead: makeLead({ conversationId: null }), contact: makeContact() },
    ]);
    vi.mocked(messageRepository.countByConversationIds).mockResolvedValue(new Map());
    vi.mocked(orderRepository.findContactIdsWithOrders).mockResolvedValue(new Set());
    vi.mocked(appointmentRepository.findContactIdsWithAppointments).mockResolvedValue(new Set());

    const result = await crmService.listLeads(WORKSPACE_ID);

    expect(messageRepository.countByConversationIds).toHaveBeenCalledWith([]);
    expect(result[0].score).toBe(0);
  });
});

describe("crmService.setLifecycleStage", () => {
  const ACTOR = { type: "human" as const, userId: "user-1" };

  it("updates the stage and logs an activity", async () => {
    vi.mocked(contactRepository.updateLifecycleStage).mockResolvedValue(makeContact({ lifecycleStage: "vip" }));

    await crmService.setLifecycleStage(WORKSPACE_ID, CONTACT_ID, "vip", ACTOR);

    expect(contactRepository.updateLifecycleStage).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, "vip");
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID, type: "contact_updated" }),
    );
  });

  it("throws when the contact doesn't exist in this workspace", async () => {
    vi.mocked(contactRepository.updateLifecycleStage).mockResolvedValue(null);

    await expect(crmService.setLifecycleStage(WORKSPACE_ID, CONTACT_ID, "vip", ACTOR)).rejects.toThrow("Contact not found.");
    expect(activityRepository.log).not.toHaveBeenCalled();
  });

  it("allows moving backwards (e.g. demoting a vip), unlike the lead-stage guard", async () => {
    vi.mocked(contactRepository.updateLifecycleStage).mockResolvedValue(makeContact({ lifecycleStage: "customer" }));

    await expect(crmService.setLifecycleStage(WORKSPACE_ID, CONTACT_ID, "customer", ACTOR)).resolves.toBeUndefined();
  });
});

describe("crmService.addTag", () => {
  const ACTOR = { type: "human" as const, userId: "user-1" };

  it("tags the contact, logs the activity, and dispatches a tag_added automation event — same as the AI tool", async () => {
    await crmService.addTag(WORKSPACE_ID, CONTACT_ID, "VIP", ACTOR);

    expect(contactRepository.addTag).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, "VIP");
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID, type: "contact_tagged", actor: ACTOR }),
    );
    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "tag_added",
      contactId: CONTACT_ID,
      tag: "VIP",
    });
  });
});

describe("crmService.removeTag", () => {
  const ACTOR = { type: "human" as const, userId: "user-1" };

  it("untags the contact and logs the activity without dispatching automation", async () => {
    await crmService.removeTag(WORKSPACE_ID, CONTACT_ID, "VIP", ACTOR);

    expect(contactRepository.removeTag).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, "VIP");
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID, type: "contact_untagged", actor: ACTOR }),
    );
    expect(automationService.dispatch).not.toHaveBeenCalled();
  });
});
