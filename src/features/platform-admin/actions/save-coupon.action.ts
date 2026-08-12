"use server";

import type { Coupon } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { couponRepository } from "../repository/coupon.repository";
import { couponFormSchema } from "../validation/plan-schemas";

export async function saveCouponAction(input: unknown): Promise<ActionResult<Coupon>> {
  const parsed = couponFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const existing = await couponRepository.findByCode(parsed.data.code);
    if (existing) throw new AppError("VALIDATION_ERROR", `A coupon with code "${parsed.data.code}" already exists.`);

    const coupon = await couponRepository.create({
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      maxRedemptions: parsed.data.maxRedemptions ?? null,
      expiresAt: parsed.data.expiresAt ?? null,
    });

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.name ?? admin.email ?? "Unknown",
      action: "coupon_created",
      targetType: "coupon",
      targetId: coupon.id,
      summary: `Created coupon "${coupon.code}".`,
    });

    return actionOk(coupon);
  } catch (error) {
    return actionFail(error);
  }
}
