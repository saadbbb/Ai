import { z } from "zod";

export const faqEntrySchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});

export const productEntrySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().nonnegative().optional(),
  /** Only meaningful while <= price — validated as a business rule in the service, not here, since price may not be set yet either. */
  discountedPrice: z.coerce.number().nonnegative().optional(),
  category: z.string().trim().max(100).optional(),
  imageUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
  /** One URL per line — same raw-text convention as imageUrl, no upload widget (see DEFERRED_TASKS.md). */
  galleryImageUrlsText: z.string().trim().max(4000).optional(),
  /** Comma-separated option names, e.g. "Small, Medium, Large" — no per-variant price override in this form yet. */
  variantNamesText: z.string().trim().max(1000).optional(),
  aiVisible: z.boolean().default(true),
  featured: z.boolean().default(false),
  promotionEndsAt: z.coerce.date().optional(),
});

export const serviceEntrySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().nonnegative().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
});

export const knowledgeBaseSchema = z.object({
  faqs: z.array(faqEntrySchema).default([]),
  products: z.array(productEntrySchema).default([]),
  services: z.array(serviceEntrySchema).default([]),
  shippingPolicy: z.string().trim().max(2000).optional(),
  returnsPolicy: z.string().trim().max(2000).optional(),
  paymentsPolicy: z.string().trim().max(2000).optional(),
});

/**
 * Settings' Knowledge Base page saves one row at a time: an id present means
 * update that row, no id means create a new one.
 */
export const faqFormSchema = faqEntrySchema.extend({ id: z.string().uuid().optional() });
export const productFormSchema = productEntrySchema.extend({ id: z.string().uuid().optional() });
export const serviceFormSchema = serviceEntrySchema.extend({ id: z.string().uuid().optional() });

export const policyFormSchema = z.object({
  shippingPolicy: z.string().trim().max(2000).optional(),
  returnsPolicy: z.string().trim().max(2000).optional(),
  paymentsPolicy: z.string().trim().max(2000).optional(),
});
