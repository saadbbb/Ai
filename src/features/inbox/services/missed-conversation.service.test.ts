import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Conversation } from "@/db/schema";
import type { ConversationListItem } from "../repository/conversation.repository";

vi.mock("../repository/conversation.repository", () => ({
  conversationRepository: { findMissedForNotification: vi.fn(), markMissedNotified: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

const { conversationRepository } = await import("../repository/conversation.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { missedConversationService } = await import("./missed-conversation.service");

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conversation-1",
    workspaceId: "workspace-1",
    contactId: "contact-1",
    channelId: "channel-1",
    status: "open",
    aiStatus: "handed_over",
    assignedUserId: null,
    pinned: false,
    priority: "normal",
    lastMessageAt: new Date("2026-01-01T00:00:00Z"),
    lastMessagePreview: "Hello?",
    lastMessageSenderType: "customer",
    missedNotifiedAt: null,
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

function makeListItem(overrides: Partial<ConversationListItem> = {}): ConversationListItem {
  return {
    conversation: makeConversation(),
    contact: makeContact(),
    channel: { id: "channel-1", type: "manual" } as never,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("missedConversationService.runDailyCheck", () => {
  it("notifies and marks each missed conversation returned by the repository", async () => {
    vi.mocked(conversationRepository.findMissedForNotification).mockResolvedValue([makeListItem()]);

    const result = await missedConversationService.runDailyCheck();

    expect(result.notified).toBe(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", type: "missed_conversation", link: "/dashboard/inbox/conversation-1" }),
    );
    expect(conversationRepository.markMissedNotified).toHaveBeenCalledWith("conversation-1");
  });

  it("continues past a single conversation's failure without throwing", async () => {
    vi.mocked(conversationRepository.findMissedForNotification).mockResolvedValue([
      makeListItem({ conversation: makeConversation({ id: "conversation-1" }) }),
      makeListItem({ conversation: makeConversation({ id: "conversation-2" }), contact: makeContact({ id: "contact-2", fullName: "Sara" }) }),
    ]);
    vi.mocked(notificationRepository.create)
      .mockRejectedValueOnce(new Error("db down"))
      // @ts-expect-error only the call succeeding matters for this test, not the return shape
      .mockResolvedValueOnce(undefined);

    const result = await missedConversationService.runDailyCheck();

    expect(result.notified).toBe(1);
    expect(conversationRepository.markMissedNotified).toHaveBeenCalledTimes(1);
    expect(conversationRepository.markMissedNotified).toHaveBeenCalledWith("conversation-2");
  });

  it("returns zero notified when nothing is missed", async () => {
    vi.mocked(conversationRepository.findMissedForNotification).mockResolvedValue([]);

    const result = await missedConversationService.runDailyCheck();

    expect(result.notified).toBe(0);
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});
