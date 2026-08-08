import { z } from "zod";
import { orderDeliveryMethodEnum, orderPaymentMethodEnum, orderStatusEnum } from "@/db/schema";

export const orderItemInputSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  unitPrice: z.coerce.number().nonnegative().transform((value) => value.toFixed(2)),
  quantity: z.coerce.number().int().positive(),
});

const moneyAmountSchema = z.coerce
  .number()
  .nonnegative()
  .default(0)
  .transform((value) => value.toFixed(2));

export const createOrderSchema = z
  .object({
    contactId: z.string().uuid(),
    conversationId: z.string().uuid().optional(),
    notes: z.string().trim().max(2000).optional(),
    items: z.array(orderItemInputSchema).min(1),
    discountAmount: moneyAmountSchema,
    taxAmount: moneyAmountSchema,
    deliveryFee: moneyAmountSchema,
    paymentMethod: z.enum(orderPaymentMethodEnum.enumValues).optional(),
    deliveryMethod: z.enum(orderDeliveryMethodEnum.enumValues).optional(),
  })
  .refine(
    (data) => {
      const subtotal = data.items.reduce((sum, item) => sum + Number.parseFloat(item.unitPrice) * item.quantity, 0);
      return Number.parseFloat(data.discountAmount) <= subtotal;
    },
    { message: "The discount can't be larger than the order's subtotal.", path: ["discountAmount"] },
  );

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(orderStatusEnum.enumValues),
});

export const updateOrderShippingSchema = z.object({
  orderId: z.string().uuid(),
  shippingCarrier: z.string().trim().max(100).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  trackingUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
});
