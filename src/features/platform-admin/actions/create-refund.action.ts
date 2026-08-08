"use server";

import type { Refund } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { refundService } from "../services/refund.service";
import { createRefundSchema } from "../validation/plan-schemas";

export async function createRefundAction(input: unknown): Promise<ActionResult<Refund>> {
  const parsed = createRefundSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const refund = await refundService.create(parsed.data.invoiceId, parsed.data.amount, parsed.data.reason);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "refund_created",
      targetType: "refund",
      targetId: refund.id,
      summary: `Requested a refund of ${refund.amount} ${refund.currency} for invoice.`,
    });

    return actionOk(refund);
  } catch (error) {
    return actionFail(error);
  }
}
