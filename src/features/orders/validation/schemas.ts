import { z } from "zod";
import { orderStatusEnum } from "@/db/schema";

export const orderItemInputSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  unitPrice: z.coerce.number().nonnegative().transform((value) => value.toFixed(2)),
  quantity: z.coerce.number().int().positive(),
});

export const createOrderSchema = z.object({
  contactId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(orderItemInputSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(orderStatusEnum.enumValues),
});
