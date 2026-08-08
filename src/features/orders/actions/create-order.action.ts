"use server";

import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import type { OrderListItem } from "../repository/order.repository";
import { orderService } from "../services/order.service";
import { createOrderSchema } from "../validation/schemas";

export async function createOrderAction(input: unknown): Promise<ActionResult<OrderListItem>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "crm.records.manage");

  try {
    const order = await orderService.createOrder(workspace.id, parsed.data, { type: "human", userId: user.id });
    return actionOk(order);
  } catch (error) {
    return actionFail(error);
  }
}
