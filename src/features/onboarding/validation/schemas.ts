import { z } from "zod";
import { languageEnumSchema } from "@/features/ai/validation/schemas";

export const businessInfoSchema = z.object({
  name: z.string().trim().min(1, "Business name is required.").max(200),
  businessType: z.string().trim().min(1, "Business type is required.").max(100),
  country: z.string().trim().min(1, "Country is required.").max(100),
  timezone: z.string().trim().min(1, "Timezone is required."),
  language: languageEnumSchema,
  logoUrl: z.string().trim().max(500).optional(),
});
