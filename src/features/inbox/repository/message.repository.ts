import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { type Message, messages, type NewMessage } from "@/db/schema";

export const messageRepository = {
  async findByConversationId(conversationId: string, workspaceId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.workspaceId, workspaceId)))
      .orderBy(asc(messages.createdAt));
  },

  /** Used for lead scoring (see lead-score.ts) — one grouped query instead of N per-lead counts. */
  async countByConversationIds(conversationIds: string[]): Promise<Map<string, number>> {
    if (conversationIds.length === 0) return new Map();
    const rows = await db
      .select({ conversationId: messages.conversationId, count: sql<number>`count(*)` })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .groupBy(messages.conversationId);
    return new Map(rows.map((row) => [row.conversationId, Number(row.count)]));
  },

  async create(data: NewMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    return message;
  },
};
