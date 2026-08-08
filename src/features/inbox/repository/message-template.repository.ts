import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type MessageTemplate, messageTemplates, type NewMessageTemplate } from "@/db/schema";

export const messageTemplateRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<MessageTemplate[]> {
    return db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.workspaceId, workspaceId))
      .orderBy(asc(messageTemplates.name));
  },

  async create(data: NewMessageTemplate): Promise<MessageTemplate> {
    const [template] = await db.insert(messageTemplates).values(data).returning();
    return template;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(messageTemplates).where(and(eq(messageTemplates.id, id), eq(messageTemplates.workspaceId, workspaceId)));
  },
};
