import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type FeatureFlag,
  featureFlagOverrides,
  featureFlags,
  type NewFeatureFlag,
  type NewFeatureFlagOverride,
  workspaces,
} from "@/db/schema";

export interface FeatureFlagOverrideWithWorkspace {
  id: string;
  workspaceId: string;
  workspaceName: string;
  enabled: boolean;
}

export const featureFlagRepository = {
  async findAll(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(asc(featureFlags.key));
  },

  async findByKey(key: string): Promise<FeatureFlag | null> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
    return flag ?? null;
  },

  async findById(id: string): Promise<FeatureFlag | null> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.id, id)).limit(1);
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

  /**
   * A flag with no row yet resolves to enabled — see the schema's own
   * comment for why. A workspace-specific override (see
   * feature-flag-overrides.ts) always wins over the flag's own default,
   * in either direction.
   */
  async isEnabled(key: string, workspaceId?: string): Promise<boolean> {
    const flag = await featureFlagRepository.findByKey(key);
    if (!flag) return true;

    if (workspaceId) {
      const [override] = await db
        .select({ enabled: featureFlagOverrides.enabled })
        .from(featureFlagOverrides)
        .where(and(eq(featureFlagOverrides.featureFlagId, flag.id), eq(featureFlagOverrides.workspaceId, workspaceId)))
        .limit(1);
      if (override) return override.enabled;
    }

    return flag.enabled;
  },

  async findOverridesByFlagId(featureFlagId: string): Promise<FeatureFlagOverrideWithWorkspace[]> {
    return db
      .select({
        id: featureFlagOverrides.id,
        workspaceId: featureFlagOverrides.workspaceId,
        workspaceName: workspaces.name,
        enabled: featureFlagOverrides.enabled,
      })
      .from(featureFlagOverrides)
      .innerJoin(workspaces, eq(workspaces.id, featureFlagOverrides.workspaceId))
      .where(eq(featureFlagOverrides.featureFlagId, featureFlagId));
  },

  async setOverride(data: NewFeatureFlagOverride): Promise<FeatureFlagOverrideWithWorkspace> {
    const [row] = await db
      .insert(featureFlagOverrides)
      .values(data)
      .onConflictDoUpdate({
        target: [featureFlagOverrides.featureFlagId, featureFlagOverrides.workspaceId],
        set: { enabled: data.enabled },
      })
      .returning();
    const [workspace] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, row.workspaceId)).limit(1);
    return { id: row.id, workspaceId: row.workspaceId, workspaceName: workspace?.name ?? "", enabled: row.enabled };
  },

  async removeOverride(id: string): Promise<void> {
    await db.delete(featureFlagOverrides).where(eq(featureFlagOverrides.id, id));
  },
};
