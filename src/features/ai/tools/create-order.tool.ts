import "server-only";
import { z } from "zod";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { orderService } from "@/features/orders/services/order.service";
import { AppError } from "@/lib/errors/app-error";
import type { AiTool, ToolContext } from "./types";

const schema = z.object({
  items: z
    .array(
      z.object({
        productName: z.string().trim().min(1).max(200),
        quantity: z.coerce.number().int().positive().max(1000),
      }),
    )
    .min(1)
    .max(20),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Rejects the whole order rather than guessing a price for an unmatched or
 * unpriced product — "never invent facts" applies to prices as much as to
 * business information (see the safety instructions in the system prompt).
 */
async function execute(context: ToolContext, input: z.infer<typeof schema>): Promise<string> {
  const products = await productRepository.findByWorkspaceId(context.workspaceId);

  const items = input.items.map((item) => {
    const matched = products.find((product) => product.name.toLowerCase() === item.productName.toLowerCase());
    if (!matched) {
      throw new AppError(
        "VALIDATION_ERROR",
        `"${item.productName}" isn't in the product catalog — ask the customer to choose from the listed products.`,
      );
    }
    if (matched.price === null) {
      throw new AppError(
        "VALIDATION_ERROR",
        `"${matched.name}" doesn't have a price set — ask a team member for pricing before placing this order.`,
      );
    }
    return { productId: matched.id, name: matched.name, unitPrice: matched.price, quantity: item.quantity };
  });

  const order = await orderService.createOrder(
    context.workspaceId,
    { contactId: context.contactId, conversationId: context.conversationId, notes: input.notes, items },
    { type: "ai" },
  );

  const total = order.items
    .reduce((sum, orderItem) => sum + Number(orderItem.unitPrice) * orderItem.quantity, 0)
    .toFixed(2);
  return `Created order with ${order.items.length} item(s), total ${total}.`;
}

export const createOrderTool: AiTool<z.infer<typeof schema>> = {
  name: "create_order",
  description:
    "Create an order for products the customer wants to buy. Use exact product names from the list provided " +
    "in your instructions — the system matches them to the catalog and pricing automatically.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            productName: { type: "string", description: "Exact product name from the catalog." },
            quantity: { type: "integer", description: "How many units." },
          },
          required: ["productName", "quantity"],
        },
      },
      notes: { type: "string", description: "Anything else useful for the team about this order." },
    },
    required: ["items"],
    additionalProperties: false,
  },
  execute,
};
