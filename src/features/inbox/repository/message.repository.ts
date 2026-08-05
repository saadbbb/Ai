import { and, asc, eq } from "drizzle-orm";
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

  async create(data: NewMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    return message;
  },
};
