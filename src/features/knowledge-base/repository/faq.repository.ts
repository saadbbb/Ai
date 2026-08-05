import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type Faq, faqs, type NewFaq } from "@/db/schema";

export const faqRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Faq[]> {
    return db.select().from(faqs).where(eq(faqs.workspaceId, workspaceId)).orderBy(faqs.sortOrder);
  },

  async createMany(data: NewFaq[]): Promise<Faq[]> {
    if (data.length === 0) return [];
    return db.insert(faqs).values(data).returning();
  },

  async update(id: string, workspaceId: string, data: Partial<Omit<NewFaq, "workspaceId">>): Promise<Faq | null> {
    const [faq] = await db
      .update(faqs)
      .set(data)
      .where(and(eq(faqs.id, id), eq(faqs.workspaceId, workspaceId)))
      .returning();
    return faq ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(faqs).where(and(eq(faqs.id, id), eq(faqs.workspaceId, workspaceId)));
  },
};
