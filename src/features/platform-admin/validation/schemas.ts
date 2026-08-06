import { z } from "zod";

export const updatePlatformSettingsSchema = z.object({
  whatsappNumber: z.string().trim().max(30).optional(),
  whatsappMessageTemplate: z.string().trim().max(500).optional(),
  supportEmail: z.string().trim().email().optional().or(z.literal("")),
});

export const addPlatformAdminSchema = z.object({
  email: z.string().trim().email(),
});

export const removePlatformAdminSchema = z.object({
  id: z.string().uuid(),
});

export const createFeatureFlagSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_.]+$/, "Key may only contain lowercase letters, numbers, dots, and underscores."),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  enabled: z.boolean(),
});

export const setFeatureFlagEnabledSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
});
