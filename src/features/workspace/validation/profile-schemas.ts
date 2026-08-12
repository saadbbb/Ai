import { z } from "zod";
import type { TranslateFn } from "@/i18n/config";

/**
 * The post-onboarding "Business Info" settings card — broader than any single
 * onboarding step (which now splits name/type/logo across separate pages),
 * since editing here should stay a single form.
 */
export function createWorkspaceProfileSchema(t: TranslateFn) {
  return z.object({
    name: z.string().trim().min(1, t("nameRequired")).max(200),
    businessType: z.string().trim().min(1, t("businessTypeRequired")).max(100),
    logoUrl: z.string().trim().max(500).optional(),
  });
}

export type WorkspaceProfileInput = z.infer<ReturnType<typeof createWorkspaceProfileSchema>>;
