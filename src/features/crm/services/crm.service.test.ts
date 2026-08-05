import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "@/db/schema";
import type { ConversationListItem } from "@/features/inbox/repository/conversation.repository";

vi.mock("@/features/automation/services/automation.service", () => ({
  automationService: { dispatch: vi.fn() },
}));

vi.mock("@/features/inbox/repository/conversation.repository", () => ({
  conversationRepository: { findById: vi.fn() },
}));

vi.mock("../repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("../repository/lead.repository", () => ({
  leadRepository: { findByConversationId: vi.fn(), create: vi.fn(), updateStage: vi.fn() },
}));

const { automationService } = await import("@/features/automation/services/automation.service");
const { conversationRepository } = await import("@/features/inbox/repository/conversation.repository");
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
