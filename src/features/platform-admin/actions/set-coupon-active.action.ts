"use server";

import type { Coupon } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { couponRepository } from "../repository/coupon.repository";
import { setCouponActiveSchema } from "../validation/plan-schemas";

export async function setCouponActiveAction(input: unknown): Promise<ActionResult<Coupon>> {
  const parsed = setCouponActiveSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const coupon = await couponRepository.setActive(parsed.data.id, parsed.data.isActive);
    if (!coupon) throw new AppError("NOT_FOUND", "Coupon not found.");

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "coupon_status_changed",
      targetType: "coupon",
      targetId: coupon.id,
      summary: `${parsed.data.isActive ? "Reactivated" : "Deactivated"} coupon "${coupon.code}".`,
    });

    return actionOk(coupon);
  } catch (error) {
    return actionFail(error);
  }
}
