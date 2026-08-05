import { z } from "zod";
import { languageEnumSchema } from "@/features/ai/validation/schemas";
import type { TranslateFn } from "@/i18n/config";

export function createBusinessInfoSchema(t: TranslateFn) {
  return z.object({
    name: z.string().trim().min(1, t("nameRequired")).max(200),
    businessType: z.string().trim().min(1, t("businessTypeRequired")).max(100),
    country: z.string().trim().min(1, t("countryRequired")).max(100),
    timezone: z.string().trim().min(1, t("timezoneRequired")),
    language: languageEnumSchema,
    logoUrl: z.string().trim().max(500).optional(),
  });
}

export type BusinessInfoInput = z.infer<ReturnType<typeof createBusinessInfoSchema>>;
