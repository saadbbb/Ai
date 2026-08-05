import "server-only";
import type { Workspace } from "@/db/schema";
import { FEATURE_KEYS, type FeatureKey } from "../lib/features";
import { planRepository } from "../repository/plan.repository";

/**
 * Trial workspaces (the default for every signup) get full access — plans
 * only restrict once a workspace is "active" on a specific plan. A missing
 * or deleted plan falls back to full access rather than silently locking
 * a paying customer out of everything.
 */
async function getEnabledFeatures(workspace: Workspace): Promise<FeatureKey[]> {
  if (workspace.subscriptionStatus !== "active" || !workspace.planId) {
    return [...FEATURE_KEYS];
  }

  const plan = await planRepository.findById(workspace.planId);
  if (!plan) return [...FEATURE_KEYS];

  return plan.enabledFeatures.filter((key): key is FeatureKey => (FEATURE_KEYS as readonly string[]).includes(key));
}

async function hasFeature(workspace: Workspace, key: FeatureKey): Promise<boolean> {
  const enabled = await getEnabledFeatures(workspace);
  return enabled.includes(key);
}

export const featureAccessService = {
  getEnabledFeatures,
  hasFeature,
};
