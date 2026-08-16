import { z } from "zod";
import type { TranslateFn } from "@/i18n/config";

/**
 * `workspaces.name` and `workspaces.businessType` validation rules — the single source
 * for both the onboarding wizard steps (features/onboarding/validation/schemas.ts) and
 * this settings-card schema below, so the two never drift apart.
 */
export function createWorkspaceNameFieldSchema(t: TranslateFn) {
  return z.string().trim().min(1, t("nameRequired")).max(200);
}

export function createBusinessTypeFieldSchema(t: TranslateFn) {
  return z.string().trim().min(1, t("businessTypeRequired")).max(100);
}

/**
 * The post-onboarding "Business Info" settings card — broader than any single
 * onboarding step (which now splits name/type/logo across separate pages),
 * since editing here should stay a single form.
 */
export function createWorkspaceProfileSchema(t: TranslateFn) {
  return z.object({
    name: createWorkspaceNameFieldSchema(t),
    businessType: createBusinessTypeFieldSchema(t),
    logoUrl: z.string().trim().max(500).optional(),
  });
}

export type WorkspaceProfileInput = z.infer<ReturnType<typeof createWorkspaceProfileSchema>>;
