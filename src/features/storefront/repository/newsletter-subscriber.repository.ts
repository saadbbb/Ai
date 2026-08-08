import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewNewsletterSubscriber, type NewsletterSubscriber, newsletterSubscribers } from "@/db/schema";

export const newsletterSubscriberRepository = {
  async findByWorkspaceAndEmail(workspaceId: string, email: string): Promise<NewsletterSubscriber | null> {
    const [row] = await db
      .select()
      .from(newsletterSubscribers)
      .where(and(eq(newsletterSubscribers.workspaceId, workspaceId), eq(newsletterSubscribers.email, email)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [row] = await db.insert(newsletterSubscribers).values(data).returning();
    return row;
  },
};
