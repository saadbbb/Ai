import { z } from "zod";

export const agentNameSchema = z.object({
  name: z.string().trim().min(1, "Give your AI employee a name.").max(100),
});

export const businessDescriptionSchema = z.object({
  businessDescription: z.string().trim().min(1, "Tell us about your business.").max(4000),
});

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
