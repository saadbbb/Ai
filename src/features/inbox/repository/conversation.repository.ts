import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type Channel,
  channels,
  type Contact,
  contacts,
  type Conversation,
  type ConversationAiStatus,
  conversations,
  type ConversationStatus,
  type NewConversation,
} from "@/db/schema";

export interface ConversationListItem {
  conversation: Conversation;
  contact: Contact;
  channel: Channel;
}

const listSelection = {
  conversation: conversations,
  contact: contacts,
  channel: channels,
};

export const conversationRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<ConversationListItem[]> {
    return db
      .select(listSelection)
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(eq(conversations.workspaceId, workspaceId))
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));
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

  async create(data: NewConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(data).returning();
    return conversation;
  },

  async touchLastMessage(id: string, workspaceId: string, preview: string): Promise<void> {
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date(), lastMessagePreview: preview, updatedAt: new Date() })
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
};
