import { z } from "zod";

export const faqEntrySchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});

export const productEntrySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().nonnegative().optional(),
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
