import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Conversation } from "@/db/schema";
import type { ConversationListItem } from "../repository/conversation.repository";

vi.mock("@/features/ai/lib/intent-detection", () => ({
  detectIntent: vi.fn().mockReturnValue("other"),
}));

vi.mock("@/features/ai/services/ai.service", () => ({
  aiService: { generateReply: vi.fn(), generateSummary: vi.fn() },
}));

vi.mock("@/features/automation/services/automation.service", () => ({
  automationService: { dispatch: vi.fn() },
}));

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("../repository/channel.repository", () => ({
  channelRepository: { ensureDefaultChannels: vi.fn(), findByType: vi.fn() },
}));

vi.mock("../repository/contact.repository", () => ({
  contactRepository: { create: vi.fn(), touchLastContact: vi.fn(), updateAiSummary: vi.fn() },
}));

vi.mock("@/features/auth/repository/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));

vi.mock("@/features/workspace/repository/membership.repository", () => ({
  membershipRepository: { findByUserAndWorkspace: vi.fn() },
}));

vi.mock("../repository/conversation.repository", () => ({
  conversationRepository: {
    findById: vi.fn(),
    findByWorkspaceId: vi.fn(),
    create: vi.fn(),
    touchLastMessage: vi.fn(),
    assignIfUnassigned: vi.fn(),
    assign: vi.fn(),
    updateAiStatus: vi.fn(),
    updateStatus: vi.fn(),
    setPinned: vi.fn(),
    setPriority: vi.fn(),
  },
}));

vi.mock("../repository/message.repository", () => ({
  messageRepository: { create: vi.fn(), findByConversationId: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

const { conversationRepository } = await import("../repository/conversation.repository");
const { userRepository } = await import("@/features/auth/repository/user.repository");
const { membershipRepository } = await import("@/features/workspace/repository/membership.repository");
const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { automationService } = await import("@/features/automation/services/automation.service");
const { aiService } = await import("@/features/ai/services/ai.service");
const { messageRepository } = await import("../repository/message.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { inboxService } = await import("./inbox.service");

const WORKSPACE_ID = "workspace-1";
const CONVERSATION_ID = "conversation-1";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: CONVERSATION_ID,
    workspaceId: WORKSPACE_ID,
    contactId: "contact-1",
    channelId: "channel-1",
    status: "open",
    aiStatus: "active",
    assignedUserId: null,
    pinned: false,
    priority: "normal",
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageSenderType: null,
    missedNotifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeListItem(overrides: Partial<ConversationListItem> = {}): ConversationListItem {
  return {
    conversation: makeConversation(),
    contact: { id: "contact-1" } as Contact,
    channel: { id: "channel-1", type: "manual" } as never,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("inboxService.setPinned", () => {
  it("pins the conversation once it's confirmed to exist in this workspace", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(makeListItem());

    await inboxService.setPinned(WORKSPACE_ID, CONVERSATION_ID, true);

    expect(conversationRepository.setPinned).toHaveBeenCalledWith(CONVERSATION_ID, WORKSPACE_ID, true);
  });

  it("throws instead of writing when the conversation isn't in this workspace (cross-tenant IDOR guard)", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(null);

    await expect(inboxService.setPinned(WORKSPACE_ID, CONVERSATION_ID, true)).rejects.toThrow("Conversation not found.");
    expect(conversationRepository.setPinned).not.toHaveBeenCalled();
  });
});

describe("inboxService.setPriority", () => {
  it("sets the priority once the conversation is confirmed", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(makeListItem());

    await inboxService.setPriority(WORKSPACE_ID, CONVERSATION_ID, "high");

    expect(conversationRepository.setPriority).toHaveBeenCalledWith(CONVERSATION_ID, WORKSPACE_ID, "high");
  });

  it("throws when the conversation doesn't exist", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(null);

    await expect(inboxService.setPriority(WORKSPACE_ID, CONVERSATION_ID, "high")).rejects.toThrow("Conversation not found.");
    expect(conversationRepository.setPriority).not.toHaveBeenCalled();
  });
});

describe("inboxService.closeConversation / reopenConversation", () => {
  it("closes an open conversation", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(makeListItem());

    await inboxService.closeConversation(WORKSPACE_ID, CONVERSATION_ID);

    expect(conversationRepository.updateStatus).toHaveBeenCalledWith(CONVERSATION_ID, WORKSPACE_ID, "closed");
  });

  it("reopens a closed conversation", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(makeListItem({ conversation: makeConversation({ status: "closed" }) }));

    await inboxService.reopenConversation(WORKSPACE_ID, CONVERSATION_ID);

    expect(conversationRepository.updateStatus).toHaveBeenCalledWith(CONVERSATION_ID, WORKSPACE_ID, "open");
  });

  it("throws for a conversation that doesn't exist in this workspace", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(null);

    await expect(inboxService.reopenConversation(WORKSPACE_ID, CONVERSATION_ID)).rejects.toThrow("Conversation not found.");
    expect(conversationRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe("inboxService.assignConversation", () => {
  const USER_ID = "user-1";

  it("assigns the conversation, logs the activity, and dispatches a conversation_assigned automation event", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(makeListItem());
    vi.mocked(membershipRepository.findByUserAndWorkspace).mockResolvedValue({
      id: "member-1",
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      roleId: "role-1",
      joinedAt: new Date(),
    });
    vi.mocked(userRepository.findById).mockResolvedValue({ id: USER_ID, email: "agent@example.com" } as never);

    await inboxService.assignConversation(WORKSPACE_ID, CONVERSATION_ID, USER_ID);

    expect(conversationRepository.assign).toHaveBeenCalledWith(CONVERSATION_ID, WORKSPACE_ID, USER_ID);
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        contactId: "contact-1",
        type: "conversation_assigned",
        actor: { type: "human", userId: USER_ID },
      }),
    );
    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "conversation_assigned",
      contactId: "contact-1",
    });
  });

  it("throws when the conversation doesn't exist in this workspace", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(null);

    await expect(inboxService.assignConversation(WORKSPACE_ID, CONVERSATION_ID, USER_ID)).rejects.toThrow(
      "Conversation not found.",
    );
    expect(conversationRepository.assign).not.toHaveBeenCalled();
  });

  it("throws when the target user is no longer a member of this workspace", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(makeListItem());
    vi.mocked(membershipRepository.findByUserAndWorkspace).mockResolvedValue(null);

    await expect(inboxService.assignConversation(WORKSPACE_ID, CONVERSATION_ID, USER_ID)).rejects.toThrow(
      "That team member is no longer part of this workspace.",
    );
    expect(conversationRepository.assign).not.toHaveBeenCalled();
  });
});

describe("inboxService.suggestReply", () => {
  it("drafts a reply from history without running tools or sending anything", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(makeListItem());
    vi.mocked(messageRepository.findByConversationId).mockResolvedValue([]);
    vi.mocked(aiService.generateReply).mockResolvedValue({
      text: "Sure, we're open until 6pm.",
      stopReason: "end_turn",
      needsHumanHandover: false,
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    const text = await inboxService.suggestReply(WORKSPACE_ID, CONVERSATION_ID);

    expect(text).toBe("Sure, we're open until 6pm.");
    expect(aiService.generateReply).toHaveBeenCalledWith(WORKSPACE_ID, []);
    expect(messageRepository.create).not.toHaveBeenCalled();
  });

  it("throws for a conversation that doesn't exist in this workspace", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(null);

    await expect(inboxService.suggestReply(WORKSPACE_ID, CONVERSATION_ID)).rejects.toThrow("Conversation not found.");
    expect(aiService.generateReply).not.toHaveBeenCalled();
  });
});

describe("inboxService.handToHuman", () => {
  const USER_ID = "user-1";

  it("marks the conversation handed over, logs the activity, and dispatches automation", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(makeListItem());

    await inboxService.handToHuman(WORKSPACE_ID, CONVERSATION_ID, USER_ID);

    expect(conversationRepository.updateAiStatus).toHaveBeenCalledWith(CONVERSATION_ID, WORKSPACE_ID, "handed_over");
    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "conversation_handed_over",
      contactId: "contact-1",
    });
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: "contact-1", type: "conversation_handed_over", actor: { type: "human", userId: USER_ID } }),
    );
  });

  it("throws for a conversation that doesn't exist in this workspace", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(null);

    await expect(inboxService.handToHuman(WORKSPACE_ID, CONVERSATION_ID, USER_ID)).rejects.toThrow("Conversation not found.");
    expect(conversationRepository.updateAiStatus).not.toHaveBeenCalled();
  });
});

describe("inboxService.logCustomerMessage", () => {
  it("notifies the workspace when the AI isn't handling the conversation", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(
      makeListItem({
        conversation: makeConversation({ aiStatus: "paused" }),
        contact: { id: "contact-1", fullName: "Ahmed" } as Contact,
      }),
    );
    vi.mocked(messageRepository.create).mockResolvedValue({ id: "message-1" } as never);

    const messages = await inboxService.logCustomerMessage(WORKSPACE_ID, CONVERSATION_ID, "Are you there?");

    expect(messages).toHaveLength(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, type: "new_message", title: "New message: Ahmed" }),
    );
    expect(aiService.generateReply).not.toHaveBeenCalled();
  });

  it("does not notify when the AI is active and will reply itself", async () => {
    vi.mocked(conversationRepository.findById).mockResolvedValue(
      makeListItem({
        conversation: makeConversation({ aiStatus: "active" }),
        contact: { id: "contact-1", fullName: "Ahmed" } as Contact,
      }),
    );
    vi.mocked(messageRepository.create).mockResolvedValue({ id: "message-1" } as never);
    vi.mocked(messageRepository.findByConversationId).mockResolvedValue([]);
    vi.mocked(aiService.generateReply).mockResolvedValue({
      text: "Sure!",
      stopReason: "end_turn",
      needsHumanHandover: false,
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    await inboxService.logCustomerMessage(WORKSPACE_ID, CONVERSATION_ID, "Are you there?");

    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});

describe("inboxService.listConversations", () => {
  it("ensures default channels exist and forwards filters straight through to the repository", async () => {
    vi.mocked(conversationRepository.findByWorkspaceId).mockResolvedValue([makeListItem()]);

    const result = await inboxService.listConversations(WORKSPACE_ID, { pinned: true, status: "open" });

    expect(result).toHaveLength(1);
    expect(conversationRepository.findByWorkspaceId).toHaveBeenCalledWith(WORKSPACE_ID, { pinned: true, status: "open" });
  });
});
