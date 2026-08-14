import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewStorefrontPage, type StorefrontPage, storefrontPages } from "@/db/schema";

export const storefrontPageRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<StorefrontPage[]> {
    return db
      .select()
      .from(storefrontPages)
      .where(eq(storefrontPages.workspaceId, workspaceId))
      .orderBy(asc(storefrontPages.sortOrder), asc(storefrontPages.createdAt));
  },

  async findPublishedByWorkspaceId(workspaceId: string): Promise<StorefrontPage[]> {
    return db
      .select()
      .from(storefrontPages)
      .where(and(eq(storefrontPages.workspaceId, workspaceId), eq(storefrontPages.isPublished, true)))
      .orderBy(asc(storefrontPages.sortOrder), asc(storefrontPages.createdAt));
  },

  async findPublishedBySlug(workspaceId: string, slug: string): Promise<StorefrontPage | null> {
    const [row] = await db
      .select()
      .from(storefrontPages)
      .where(
        and(eq(storefrontPages.workspaceId, workspaceId), eq(storefrontPages.slug, slug), eq(storefrontPages.isPublished, true)),
      )
      .limit(1);
    return row ?? null;
  },

  async findById(id: string, workspaceId: string): Promise<StorefrontPage | null> {
    const [row] = await db
      .select()
      .from(storefrontPages)
      .where(and(eq(storefrontPages.id, id), eq(storefrontPages.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  },

  async findBySlugAnyStatus(workspaceId: string, slug: string): Promise<StorefrontPage | null> {
    const [row] = await db
      .select()
      .from(storefrontPages)
      .where(and(eq(storefrontPages.workspaceId, workspaceId), eq(storefrontPages.slug, slug)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewStorefrontPage): Promise<StorefrontPage> {
    const [row] = await db.insert(storefrontPages).values(data).returning();
    return row;
  },

  async update(id: string, workspaceId: string, data: Partial<Omit<NewStorefrontPage, "workspaceId">>): Promise<StorefrontPage | null> {
    const [row] = await db
      .update(storefrontPages)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(storefrontPages.id, id), eq(storefrontPages.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(storefrontPages).where(and(eq(storefrontPages.id, id), eq(storefrontPages.workspaceId, workspaceId)));
  },
};
