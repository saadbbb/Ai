import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewWorkspace, type Workspace, workspaces } from "@/db/schema";

export const workspaceRepository = {
  async create(data: NewWorkspace): Promise<Workspace> {
    const [workspace] = await db.insert(workspaces).values(data).returning();
    return workspace;
  },

  async findById(id: string): Promise<Workspace | null> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return workspace ?? null;
  },

  async findBySlug(slug: string): Promise<Workspace | null> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
    return workspace ?? null;
  },
};
