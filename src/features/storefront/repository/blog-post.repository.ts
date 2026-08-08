import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type BlogPost, blogPosts, type NewBlogPost } from "@/db/schema";

export const blogPostRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<BlogPost[]> {
    return db.select().from(blogPosts).where(eq(blogPosts.workspaceId, workspaceId)).orderBy(desc(blogPosts.createdAt));
  },

  async findPublishedByWorkspaceId(workspaceId: string): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.workspaceId, workspaceId), eq(blogPosts.isPublished, true)))
      .orderBy(desc(blogPosts.createdAt));
  },

  async findPublishedBySlug(workspaceId: string, slug: string): Promise<BlogPost | null> {
    const [row] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.workspaceId, workspaceId), eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)))
      .limit(1);
    return row ?? null;
  },

  async findById(id: string, workspaceId: string): Promise<BlogPost | null> {
    const [row] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.id, id), eq(blogPosts.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  },

  async findBySlugAnyStatus(workspaceId: string, slug: string): Promise<BlogPost | null> {
    const [row] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.workspaceId, workspaceId), eq(blogPosts.slug, slug)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewBlogPost): Promise<BlogPost> {
    const [row] = await db.insert(blogPosts).values(data).returning();
    return row;
  },

  async update(id: string, workspaceId: string, data: Partial<Omit<NewBlogPost, "workspaceId">>): Promise<BlogPost | null> {
    const [row] = await db
      .update(blogPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(blogPosts.id, id), eq(blogPosts.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(blogPosts).where(and(eq(blogPosts.id, id), eq(blogPosts.workspaceId, workspaceId)));
  },
};
