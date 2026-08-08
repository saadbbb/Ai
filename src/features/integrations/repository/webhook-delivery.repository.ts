import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewWebhookDelivery, type WebhookDelivery, webhookDeliveries } from "@/db/schema";

export const webhookDeliveryRepository = {
  async create(data: NewWebhookDelivery): Promise<void> {
    await db.insert(webhookDeliveries).values(data);
  },

  async findBySubscriptionId(subscriptionId: string, limit = 10): Promise<WebhookDelivery[]> {
    return db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.subscriptionId, subscriptionId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
  },
};
