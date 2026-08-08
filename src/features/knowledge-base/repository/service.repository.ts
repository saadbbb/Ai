import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewService, type Service, services } from "@/db/schema";

export const serviceRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Service[]> {
    return db.select().from(services).where(eq(services.workspaceId, workspaceId));
  },

  async findById(id: string, workspaceId: string): Promise<Service | null> {
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.workspaceId, workspaceId)))
      .limit(1);
    return service ?? null;
  },

  async createMany(data: NewService[]): Promise<Service[]> {
    if (data.length === 0) return [];
    return db.insert(services).values(data).returning();
  },

  async update(
    id: string,
    workspaceId: string,
    data: Partial<Omit<NewService, "workspaceId">>,
  ): Promise<Service | null> {
    const [service] = await db
      .update(services)
      .set(data)
      .where(and(eq(services.id, id), eq(services.workspaceId, workspaceId)))
      .returning();
    return service ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(services).where(and(eq(services.id, id), eq(services.workspaceId, workspaceId)));
  },
};
