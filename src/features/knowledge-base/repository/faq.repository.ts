import { eq } from "drizzle-orm";
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
};
