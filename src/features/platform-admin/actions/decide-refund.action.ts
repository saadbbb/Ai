"use server";

import type { Refund } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { refundService } from "../services/refund.service";
import { decideRefundSchema } from "../validation/plan-schemas";

export async function decideRefundAction(input: unknown): Promise<ActionResult<Refund>> {
  const parsed = decideRefundSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const refund = await refundService.decide(parsed.data.id, parsed.data.status);

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "refund_status_changed",
      targetType: "refund",
      targetId: refund.id,
      summary: `Marked refund as "${refund.status}".`,
    });

    return actionOk(refund);
  } catch (error) {
    return actionFail(error);
  }
}
