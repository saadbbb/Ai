import { z } from "zod";
import type { TranslateFn } from "@/i18n/config";
import { createBusinessTypeFieldSchema, createWorkspaceNameFieldSchema } from "@/features/workspace/validation/profile-schemas";

export function createOwnerNameSchema(t: TranslateFn) {
  return z.object({
    // The user's own name (users.name) — a different field from workspaces.name below;
    // same shape by coincidence, not shared on purpose.
    name: z.string().trim().min(1, t("ownerNameRequired")).max(200),
  });
}

export function createBusinessInfoSchema(t: TranslateFn) {
  return z.object({
    name: createWorkspaceNameFieldSchema(t),
  });
}

export function createBusinessTypeSchema(t: TranslateFn) {
  return z.object({
    businessType: createBusinessTypeFieldSchema(t),
  });
}

export type OwnerNameInput = z.infer<ReturnType<typeof createOwnerNameSchema>>;
export type BusinessInfoInput = z.infer<ReturnType<typeof createBusinessInfoSchema>>;
export type BusinessTypeInput = z.infer<ReturnType<typeof createBusinessTypeSchema>>;
