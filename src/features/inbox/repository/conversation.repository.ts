import { and, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type Channel,
  channels,
  type Contact,
  contacts,
  type Conversation,
  type ConversationAiStatus,
  conversations,
  type ConversationPriority,
  type ConversationStatus,
  type MessageSenderType,
  type NewConversation,
} from "@/db/schema";

export interface ConversationListItem {
  conversation: Conversation;
  contact: Contact;
  channel: Channel;
}

export interface ConversationFilters {
  search?: string;
  status?: ConversationStatus;
  aiStatus?: ConversationAiStatus;
  assignedUserId?: string;
  unassigned?: boolean;
  pinned?: boolean;
  priority?: ConversationPriority;
  /** Last message was from the customer and nobody's answered yet. */
  needsReply?: boolean;
  tag?: string;
}

const listSelection = {
  conversation: conversations,
  contact: contacts,
  channel: channels,
};

export const conversationRepository = {
  async findByWorkspaceId(workspaceId: string, filters?: ConversationFilters): Promise<ConversationListItem[]> {
    const trimmed = filters?.search?.trim();
    const pattern = trimmed ? `%${trimmed}%` : undefined;
    return db
      .select(listSelection)
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          pattern
            ? or(
                ilike(contacts.fullName, pattern),
                ilike(contacts.phone, pattern),
                ilike(conversations.lastMessagePreview, pattern),
              )
            : undefined,
          filters?.status ? eq(conversations.status, filters.status) : undefined,
          filters?.aiStatus ? eq(conversations.aiStatus, filters.aiStatus) : undefined,
          filters?.assignedUserId ? eq(conversations.assignedUserId, filters.assignedUserId) : undefined,
          filters?.unassigned ? isNull(conversations.assignedUserId) : undefined,
          filters?.pinned !== undefined ? eq(conversations.pinned, filters.pinned) : undefined,
          filters?.priority ? eq(conversations.priority, filters.priority) : undefined,
          filters?.needsReply ? eq(conversations.lastMessageSenderType, "customer") : undefined,
          filters?.tag ? sql`${contacts.tags} @> ${JSON.stringify([filters.tag])}` : undefined,
        ),
      )
      .orderBy(desc(conversations.pinned), desc(conversations.lastMessageAt), desc(conversations.createdAt));
  },

  async findById(id: string, workspaceId: string): Promise<ConversationListItem | null> {
    const [row] = await db
      .select(listSelection)
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  },

  async findByContactId(contactId: string, workspaceId: string): Promise<ConversationListItem[]> {
    return db
      .select(listSelection)
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(and(eq(conversations.contactId, contactId), eq(conversations.workspaceId, workspaceId)))
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));
  },

  /** Open conversations assigned to a specific team member — feeds the Agent Home dashboard's "My Work" band. */
  async findOpenByAssignedUser(workspaceId: string, userId: string): Promise<ConversationListItem[]> {
    return db
      .select(listSelection)
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          eq(conversations.assignedUserId, userId),
          eq(conversations.status, "open"),
        ),
      )
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));
  },

  /** Used by usage.service.ts — a SQL count rather than fetching+filtering every conversation. */
  async countCreatedSince(workspaceId: string, since: Date): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(conversations)
      .where(and(eq(conversations.workspaceId, workspaceId), gte(conversations.createdAt, since)));
    return row?.value ?? 0;
  },

  async create(data: NewConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(data).returning();
    return conversation;
  },

  async touchLastMessage(id: string, workspaceId: string, preview: string, senderType: MessageSenderType): Promise<void> {
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: preview,
        lastMessageSenderType: senderType,
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)));
  },

  async setPinned(id: string, workspaceId: string, pinned: boolean): Promise<void> {
    await db
      .update(conversations)
      .set({ pinned, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)));
  },

  async setPriority(id: string, workspaceId: string, priority: ConversationPriority): Promise<void> {
    await db
      .update(conversations)
      .set({ priority, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)));
  },

  async assignIfUnassigned(id: string, workspaceId: string, userId: string): Promise<void> {
    await db
      .update(conversations)
      .set({ assignedUserId: userId, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId), isNull(conversations.assignedUserId)));
  },

  /** Unconditional — overrides any existing assignment, unlike assignIfUnassigned. */
  async assign(id: string, workspaceId: string, userId: string): Promise<void> {
    await db
      .update(conversations)
      .set({ assignedUserId: userId, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)));
  },

  async updateAiStatus(id: string, workspaceId: string, aiStatus: ConversationAiStatus): Promise<void> {
    await db
      .update(conversations)
      .set({ aiStatus, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)));
  },

  async updateStatus(id: string, workspaceId: string, status: ConversationStatus): Promise<void> {
    await db
      .update(conversations)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)));
  },

  /**
   * Global scan across every workspace (no workspaceId filter) — same
   * cross-tenant daily-cron shape as leadRepository.findStaleOpenLeads.
   * "Missed" = still open, a human is (or should be) handling it, the
   * customer spoke last, and nobody's replied since before `staleBefore`.
   */
  async findMissedForNotification(staleBefore: Date, renotifyBefore: Date): Promise<ConversationListItem[]> {
    return db
      .select(listSelection)
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(
          eq(conversations.status, "open"),
          or(eq(conversations.aiStatus, "paused"), eq(conversations.aiStatus, "handed_over")),
          eq(conversations.lastMessageSenderType, "customer"),
          lte(conversations.lastMessageAt, staleBefore),
          or(isNull(conversations.missedNotifiedAt), lte(conversations.missedNotifiedAt, renotifyBefore)),
        ),
      );
  },

  async markMissedNotified(id: string): Promise<void> {
    await db.update(conversations).set({ missedNotifiedAt: new Date() }).where(eq(conversations.id, id));
  },
};
