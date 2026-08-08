"use server";

import type { Order } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { orderService } from "../services/order.service";
import { updateOrderShippingSchema } from "../validation/schemas";

export async function updateOrderShippingAction(input: unknown): Promise<ActionResult<Order>> {
  const parsed = updateOrderShippingSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "crm.records.manage");

  try {
    const order = await orderService.updateShipping(
      workspace.id,
      parsed.data.orderId,
      {
        shippingCarrier: parsed.data.shippingCarrier,
        trackingNumber: parsed.data.trackingNumber,
        trackingUrl: parsed.data.trackingUrl,
      },
      { type: "human", userId: user.id },
    );
    return actionOk(order);
  } catch (error) {
    return actionFail(error);
  }
}
