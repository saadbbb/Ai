/**
 * Known feature flag keys referenced from tenant-facing code, kept in one
 * place so a grep for "FEATURE_FLAG_KEYS" finds every gated code path. A
 * Super Admin still has to create the matching row at /admin/feature-flags
 * before it does anything — see featureFlagRepository.isEnabled's fail-open
 * default.
 */
export const FEATURE_FLAG_KEYS = {
  AI_WORKFLOW_GENERATOR: "automation.ai_workflow_generator",
} as const;
