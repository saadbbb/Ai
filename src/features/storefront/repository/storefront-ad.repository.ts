import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewStorefrontAd, type StorefrontAd, storefrontAds } from "@/db/schema";

export const storefrontAdRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<StorefrontAd[]> {
    return db
      .select()
      .from(storefrontAds)
      .where(eq(storefrontAds.workspaceId, workspaceId))
      .orderBy(asc(storefrontAds.sortOrder), asc(storefrontAds.createdAt));
  },

  async findPublishedByWorkspaceId(workspaceId: string): Promise<StorefrontAd[]> {
    return db
      .select()
      .from(storefrontAds)
      .where(and(eq(storefrontAds.workspaceId, workspaceId), eq(storefrontAds.isPublished, true)))
      .orderBy(asc(storefrontAds.sortOrder), asc(storefrontAds.createdAt));
  },

  async findById(id: string, workspaceId: string): Promise<StorefrontAd | null> {
    const [row] = await db
      .select()
      .from(storefrontAds)
      .where(and(eq(storefrontAds.id, id), eq(storefrontAds.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewStorefrontAd): Promise<StorefrontAd> {
    const [row] = await db.insert(storefrontAds).values(data).returning();
    return row;
  },

  async update(id: string, workspaceId: string, data: Partial<Omit<NewStorefrontAd, "workspaceId">>): Promise<StorefrontAd | null> {
    const [row] = await db
      .update(storefrontAds)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(storefrontAds.id, id), eq(storefrontAds.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(storefrontAds).where(and(eq(storefrontAds.id, id), eq(storefrontAds.workspaceId, workspaceId)));
  },
};
