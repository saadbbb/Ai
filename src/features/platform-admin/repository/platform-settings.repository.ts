import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewPlatformSettings, type PlatformSettings, platformSettings } from "@/db/schema";

export const platformSettingsRepository = {
  async get(): Promise<PlatformSettings | null> {
    const [row] = await db.select().from(platformSettings).limit(1);
    return row ?? null;
  },

  async upsert(data: Omit<NewPlatformSettings, "id" | "updatedAt">): Promise<PlatformSettings> {
    const existing = await platformSettingsRepository.get();

    if (!existing) {
      const [row] = await db.insert(platformSettings).values(data).returning();
      return row;
    }

    const [row] = await db
      .update(platformSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformSettings.id, existing.id))
      .returning();
    return row;
  },

  async setAiEnabled(enabled: boolean): Promise<PlatformSettings> {
    const existing = await platformSettingsRepository.get();

    if (!existing) {
      const [row] = await db.insert(platformSettings).values({ aiEnabled: enabled }).returning();
      return row;
    }

    const [row] = await db
      .update(platformSettings)
      .set({ aiEnabled: enabled, updatedAt: new Date() })
      .where(eq(platformSettings.id, existing.id))
      .returning();
    return row;
  },
};
