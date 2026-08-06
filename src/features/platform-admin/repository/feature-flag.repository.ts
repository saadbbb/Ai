import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type FeatureFlag, featureFlags, type NewFeatureFlag } from "@/db/schema";

export const featureFlagRepository = {
  async findAll(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(asc(featureFlags.key));
  },

  async findByKey(key: string): Promise<FeatureFlag | null> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
    return flag ?? null;
  },

  async create(data: Pick<NewFeatureFlag, "key" | "name" | "description" | "enabled">): Promise<FeatureFlag> {
    const [flag] = await db.insert(featureFlags).values(data).returning();
    return flag;
  },

  async setEnabled(id: string, enabled: boolean): Promise<FeatureFlag | null> {
    const [flag] = await db
      .update(featureFlags)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(featureFlags.id, id))
      .returning();
    return flag ?? null;
  },

  /** A flag with no row yet resolves to enabled — see the schema's own comment for why. */
  async isEnabled(key: string): Promise<boolean> {
    const flag = await featureFlagRepository.findByKey(key);
    return flag ? flag.enabled : true;
  },
};
