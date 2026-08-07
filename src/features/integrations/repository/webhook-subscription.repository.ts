import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewWebhookSubscription, type WebhookSubscription, webhookSubscriptions } from "@/db/schema";

export const webhookSubscriptionRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<WebhookSubscription[]> {
    return db
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.workspaceId, workspaceId))
      .orderBy(desc(webhookSubscriptions.createdAt));
  },

  async create(data: Pick<NewWebhookSubscription, "workspaceId" | "url" | "eventTypes" | "secret">): Promise<WebhookSubscription> {
    const [row] = await db.insert(webhookSubscriptions).values(data).returning();
    return row;
  },

  async setActive(id: string, workspaceId: string, isActive: boolean): Promise<WebhookSubscription | null> {
    const [row] = await db
      .update(webhookSubscriptions)
      .set({ isActive })
      .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(webhookSubscriptions).where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.workspaceId, workspaceId)));
  },

  /** Active subscriptions for this workspace whose eventTypes includes the given event — the dispatch-side lookup. */
  async findActiveByWorkspaceAndEvent(workspaceId: string, eventType: string): Promise<WebhookSubscription[]> {
    return db
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.workspaceId, workspaceId),
          eq(webhookSubscriptions.isActive, true),
          sql`${webhookSubscriptions.eventTypes} @> ${JSON.stringify([eventType])}`,
        ),
      );
  },
};
