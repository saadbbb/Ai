import { z } from "zod";

export const updateStorefrontSchema = z.object({
  isPublished: z.boolean(),
  heroTitle: z.string().trim().max(200).optional(),
  heroSubtitle: z.string().trim().max(300).optional(),
  aboutText: z.string().trim().max(2000).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #2563eb.")
    .optional()
    .or(z.literal("")),
});

export const submitInquirySchema = z.object({
  slug: z.string().trim().min(1),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(3).max(30),
  message: z.string().trim().min(1).max(2000),
});
