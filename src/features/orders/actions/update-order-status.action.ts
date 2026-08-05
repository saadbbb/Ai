"use server";

import type { Order } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { orderService } from "../services/order.service";
import { updateOrderStatusSchema } from "../validation/schemas";

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult<Order>> {
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const order = await orderService.updateOrderStatus(workspace.id, parsed.data.orderId, parsed.data.status, {
      type: "human",
      userId: user.id,
    });
    return actionOk(order);
  } catch (error) {
    return actionFail(error);
  }
}
