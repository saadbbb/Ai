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
