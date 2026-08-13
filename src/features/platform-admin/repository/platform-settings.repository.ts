import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { type AiCreativity, type NewPlatformSettings, type PlatformSettings, platformSettings } from "@/db/schema";

export const PLATFORM_SETTINGS_CACHE_TAG = "platform-settings";

async function get(): Promise<PlatformSettings | null> {
  const [row] = await db.select().from(platformSettings).limit(1);
  return row ?? null;
}

/**
 * A cached read for display-only call sites (billing page's WhatsApp CTA,
 * support-email fallback, the phone forgot-password screen, etc.) — this is
 * a single row that rarely changes and was previously re-queried from the DB
 * on every request across several pages. Mutations call
 * revalidateTag(PLATFORM_SETTINGS_CACHE_TAG) so a change is reflected
 * immediately, not after the 60s fallback window.
 *
 * Deliberately NOT used by ai.service.ts's aiEnabled kill-switch check —
 * that one instant-effect safety control always reads get() directly, so an
 * admin disabling AI replies during an incident takes effect on the very
 * next message, with zero possible staleness window.
 */
const getCached = unstable_cache(get, ["platform-settings"], {
  tags: [PLATFORM_SETTINGS_CACHE_TAG],
  revalidate: 60,
});

export const platformSettingsRepository = {
  get,
  getCached,

  async upsert(data: Omit<NewPlatformSettings, "id" | "updatedAt">): Promise<PlatformSettings> {
    const existing = await get();

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
    const existing = await get();

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

  async setDefaultCreativity(creativity: AiCreativity): Promise<PlatformSettings> {
    const existing = await get();

    if (!existing) {
      const [row] = await db.insert(platformSettings).values({ defaultCreativity: creativity }).returning();
      return row;
    }

    const [row] = await db
      .update(platformSettings)
      .set({ defaultCreativity: creativity, updatedAt: new Date() })
      .where(eq(platformSettings.id, existing.id))
      .returning();
    return row;
  },
};
