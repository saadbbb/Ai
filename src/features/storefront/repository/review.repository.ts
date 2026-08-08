import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewReview, type Review, reviews } from "@/db/schema";

export const reviewRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.workspaceId, workspaceId)).orderBy(desc(reviews.createdAt));
  },

  async findPublishedByWorkspaceId(workspaceId: string): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(and(eq(reviews.workspaceId, workspaceId), eq(reviews.isPublished, true)))
      .orderBy(desc(reviews.createdAt));
  },

  async findById(id: string, workspaceId: string): Promise<Review | null> {
    const [row] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewReview): Promise<Review> {
    const [row] = await db.insert(reviews).values(data).returning();
    return row;
  },

  async update(id: string, workspaceId: string, data: Partial<Omit<NewReview, "workspaceId">>): Promise<Review | null> {
    const [row] = await db
      .update(reviews)
      .set(data)
      .where(and(eq(reviews.id, id), eq(reviews.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(reviews).where(and(eq(reviews.id, id), eq(reviews.workspaceId, workspaceId)));
  },
};
