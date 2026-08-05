import { z } from "zod";
import type { TranslateFn } from "@/i18n/config";

export function createAgentNameSchema(t: TranslateFn) {
  return z.object({
    name: z.string().trim().min(1, t("agentNameRequired")).max(100),
  });
}

export function createBusinessDescriptionSchema(t: TranslateFn) {
  return z.object({
    businessDescription: z.string().trim().min(1, t("businessDescriptionRequired")).max(4000),
  });
}

export const languageEnumSchema = z.enum(["ar", "en", "ku"]);

export const responseLanguageSchema = z.object({
  language: languageEnumSchema,
});

export const toneEnumSchema = z.enum([
  "friendly",
  "professional",
  "luxury",
  "formal",
  "casual",
  "medical",
  "corporate",
]);

export const toneSchema = z.object({
  tone: toneEnumSchema,
});

export const creativityEnumSchema = z.enum(["low", "medium", "high"]);

export const creativitySchema = z.object({
  creativity: creativityEnumSchema,
});

const dayScheduleSchema = z.object({
  closed: z.boolean(),
  open: z.string(),
  close: z.string(),
});

export const workingHoursSchema = z.object({
  timezone: z.string().trim().min(1),
  schedule: z.object({
    mon: dayScheduleSchema,
    tue: dayScheduleSchema,
    wed: dayScheduleSchema,
    thu: dayScheduleSchema,
    fri: dayScheduleSchema,
    sat: dayScheduleSchema,
    sun: dayScheduleSchema,
  }),
  holidayNotes: z.string().trim().max(2000).optional().nullable(),
});

export const handoverSchema = z.object({
  handoverEnabled: z.boolean(),
  handoverInstructions: z.string().trim().max(2000).optional().nullable(),
});

export type AgentNameInput = z.infer<ReturnType<typeof createAgentNameSchema>>;
export type BusinessDescriptionInput = z.infer<ReturnType<typeof createBusinessDescriptionSchema>>;
