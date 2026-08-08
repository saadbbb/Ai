import "server-only";
import type { Coupon } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { couponRepository } from "../repository/coupon.repository";

export interface CouponApplication {
  coupon: Coupon;
  discountedAmount: string;
}

function computeDiscountedAmount(baseAmount: string, coupon: Coupon): string {
  const base = Number.parseFloat(baseAmount);
  const value = Number.parseFloat(coupon.value);
  const discounted = coupon.type === "percentage" ? base * (1 - value / 100) : base - value;
  return Math.max(discounted, 0).toFixed(2);
}

/**
 * Validates a coupon code against the same rules its redemption count relies
 * on (active, not expired, under its redemption cap) and returns the
 * discounted amount — never mutates anything. Call redeem() separately,
 * after the activation this discount was for actually succeeds, so a failed
 * activation never burns a redemption.
 */
async function validate(code: string, baseAmount: string): Promise<CouponApplication> {
  const coupon = await couponRepository.findByCode(code.trim().toUpperCase());
  if (!coupon) throw new AppError("NOT_FOUND", "This coupon code doesn't exist.");
  if (!coupon.isActive) throw new AppError("VALIDATION_ERROR", "This coupon is no longer active.");
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new AppError("VALIDATION_ERROR", "This coupon has expired.");
  }
  if (coupon.maxRedemptions !== null && coupon.timesRedeemed >= coupon.maxRedemptions) {
    throw new AppError("VALIDATION_ERROR", "This coupon has already been fully redeemed.");
  }

  return { coupon, discountedAmount: computeDiscountedAmount(baseAmount, coupon) };
}

async function redeem(couponId: string): Promise<void> {
  await couponRepository.incrementRedemptions(couponId);
}

export const couponService = {
  validate,
  redeem,
};
