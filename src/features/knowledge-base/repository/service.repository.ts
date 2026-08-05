import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewService, type Service, services } from "@/db/schema";

export const serviceRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Service[]> {
    return db.select().from(services).where(eq(services.workspaceId, workspaceId));
  },

  async createMany(data: NewService[]): Promise<Service[]> {
    if (data.length === 0) return [];
    return db.insert(services).values(data).returning();
  },
};
