import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewPlatformAdmin, type PlatformAdmin, platformAdmins } from "@/db/schema";

export const platformAdminRepository = {
  async findAll(): Promise<PlatformAdmin[]> {
    return db.select().from(platformAdmins).orderBy(platformAdmins.createdAt);
  },

  async findByEmail(email: string): Promise<PlatformAdmin | null> {
    const [row] = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, email.toLowerCase()))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewPlatformAdmin): Promise<PlatformAdmin> {
    const [row] = await db
      .insert(platformAdmins)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();
    return row;
  },

  async delete(id: string): Promise<void> {
    await db.delete(platformAdmins).where(eq(platformAdmins.id, id));
  },
};
