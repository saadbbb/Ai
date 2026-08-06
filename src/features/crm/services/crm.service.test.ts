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
  leadRepository: { findByConversationId: vi.fn(), findByWorkspaceId: vi.fn(), create: vi.fn(), updateStage: vi.fn() },
}));

const { automationService } = await import("@/features/automation/services/automation.service");
const { conversationRepository } = await import("@/features/inbox/repository/conversation.repository");
const { messageRepository } = await import("@/features/inbox/repository/message.repository");
const { orderRepository } = await import("@/features/orders/repository/order.repository");
const { appointmentRepository } = await import("@/features/appointments/repository/appointment.repository");
const { activityRepository } = await import("../repository/activity.repository");
const { leadRepository } = await import("../repository/lead.repository");
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
    lastContactAt: null,
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
