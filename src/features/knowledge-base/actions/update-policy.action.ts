"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { policyRepository } from "../repository/policy.repository";
import { policyFormSchema } from "../validation/schemas";

export async function updatePolicyAction(input: unknown): Promise<ActionResult> {
  const parsed = policyFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await policyRepository.upsert({
      workspaceId: workspace.id,
      shippingPolicy: parsed.data.shippingPolicy ?? null,
      returnsPolicy: parsed.data.returnsPolicy ?? null,
      paymentsPolicy: parsed.data.paymentsPolicy ?? null,
    });
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
