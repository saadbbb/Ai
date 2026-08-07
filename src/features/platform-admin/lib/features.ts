/**
 * Single source of truth for what a plan can grant/withhold — the admin's
 * plan-builder checkboxes, the dashboard nav filter, and each gated page's
 * server-side check all read from this same list. Add a module here and it's
 * automatically available to toggle per plan.
 */
export const FEATURE_KEYS = [
  "inbox",
  "contacts",
  "leads",
  "orders",
  "appointments",
  "automations",
  "knowledge_base",
  "analytics",
  "website",
  "integrations",
  "campaigns",
  "ads",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
