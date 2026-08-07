import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewStorefront, type Storefront, storefronts, workspaces } from "@/db/schema";

export const storefrontRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Storefront | null> {
    const [row] = await db.select().from(storefronts).where(eq(storefronts.workspaceId, workspaceId)).limit(1);
    return row ?? null;
  },

  async create(data: NewStorefront): Promise<Storefront> {
    const [row] = await db.insert(storefronts).values(data).returning();
    return row;
  },

  async update(id: string, workspaceId: string, data: Partial<Omit<NewStorefront, "workspaceId">>): Promise<Storefront | null> {
    const [row] = await db
      .update(storefronts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(storefronts.id, id), eq(storefronts.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  /** Public lookup by the workspace's slug — only ever returns a storefront that's actually published. */
  async findPublishedByWorkspaceSlug(slug: string): Promise<{ storefront: Storefront; workspaceId: string; workspaceName: string; logoUrl: string | null } | null> {
    const [row] = await db
      .select({
        storefront: storefronts,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        logoUrl: workspaces.logoUrl,
      })
      .from(storefronts)
      .innerJoin(workspaces, eq(workspaces.id, storefronts.workspaceId))
      .where(and(eq(workspaces.slug, slug), eq(storefronts.isPublished, true)))
      .limit(1);
    return row ?? null;
  },
};
