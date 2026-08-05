"use server";

import { z } from "zod";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { productRepository } from "../repository/product.repository";

const inputSchema = z.object({ id: z.string().uuid() });

export async function deleteProductAction(input: unknown): Promise<ActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await productRepository.delete(parsed.data.id, workspace.id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
