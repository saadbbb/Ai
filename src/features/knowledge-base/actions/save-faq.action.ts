"use server";

import type { Faq } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { faqRepository } from "../repository/faq.repository";
import { faqFormSchema } from "../validation/schemas";

export async function saveFaqAction(input: unknown): Promise<ActionResult<Faq>> {
  const parsed = faqFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const { id, ...data } = parsed.data;

  try {
    if (id) {
      const updated = await faqRepository.update(id, workspace.id, data);
      if (!updated) {
        return actionFail(new Error("FAQ not found."));
      }
      return actionOk(updated);
    }

    const [created] = await faqRepository.createMany([{ ...data, workspaceId: workspace.id }]);
    return actionOk(created);
  } catch (error) {
    return actionFail(error);
  }
}
