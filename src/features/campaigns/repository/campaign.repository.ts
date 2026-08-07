import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type Campaign, campaigns, type NewCampaign } from "@/db/schema";

export const campaignRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Campaign[]> {
    return db.select().from(campaigns).where(eq(campaigns.workspaceId, workspaceId)).orderBy(desc(campaigns.createdAt));
  },

  async findById(id: string, workspaceId: string): Promise<Campaign | null> {
    const [row] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  },

  async create(data: Omit<NewCampaign, "id" | "status" | "recipientCount" | "sentAt" | "createdAt" | "updatedAt">): Promise<Campaign> {
    const [row] = await db.insert(campaigns).values(data).returning();
    return row;
  },

  async markSent(id: string, workspaceId: string, recipientCount: number): Promise<Campaign | null> {
    const [row] = await db
      .update(campaigns)
      .set({ status: "sent", recipientCount, sentAt: new Date(), updatedAt: new Date() })
      .where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },
};
