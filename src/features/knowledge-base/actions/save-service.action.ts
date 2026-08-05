"use server";

import type { Service } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { serviceRepository } from "../repository/service.repository";
import { serviceFormSchema } from "../validation/schemas";

export async function saveServiceAction(input: unknown): Promise<ActionResult<Service>> {
  const parsed = serviceFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const { id, price, ...rest } = parsed.data;
  const data = { ...rest, price: price?.toString() };

  try {
    if (id) {
      const updated = await serviceRepository.update(id, workspace.id, data);
      if (!updated) {
        return actionFail(new Error("Service not found."));
      }
      return actionOk(updated);
    }

    const [created] = await serviceRepository.createMany([{ ...data, workspaceId: workspace.id }]);
    return actionOk(created);
  } catch (error) {
    return actionFail(error);
  }
}
