import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Coupon } from "@/db/schema";

vi.mock("../repository/coupon.repository", () => ({
  couponRepository: { findByCode: vi.fn(), incrementRedemptions: vi.fn() },
}));

const { couponRepository } = await import("../repository/coupon.repository");
const { couponService } = await import("./coupon.service");

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "WELCOME20",
    type: "percentage",
    value: "20.00",
    maxRedemptions: null,
    timesRedeemed: 0,
    expiresAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("couponService.validate", () => {
  it("computes a percentage discount off the base amount", async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(makeCoupon({ type: "percentage", value: "20.00" }));

    const result = await couponService.validate("welcome20", "100.00");

    expect(result.discountedAmount).toBe("80.00");
    expect(couponRepository.findByCode).toHaveBeenCalledWith("WELCOME20");
  });

  it("computes a fixed discount off the base amount", async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(makeCoupon({ type: "fixed", value: "15.00" }));

    const result = await couponService.validate("SAVE15", "100.00");

    expect(result.discountedAmount).toBe("85.00");
  });

  it("never discounts below zero", async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(makeCoupon({ type: "fixed", value: "500.00" }));

    const result = await couponService.validate("HUGE", "100.00");

    expect(result.discountedAmount).toBe("0.00");
  });

  it("rejects an unknown code", async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(null);

    await expect(couponService.validate("NOPE", "100.00")).rejects.toThrow("doesn't exist");
  });

  it("rejects an inactive coupon", async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(makeCoupon({ isActive: false }));

    await expect(couponService.validate("WELCOME20", "100.00")).rejects.toThrow("no longer active");
  });

  it("rejects an expired coupon", async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(makeCoupon({ expiresAt: new Date(Date.now() - 1000) }));

    await expect(couponService.validate("WELCOME20", "100.00")).rejects.toThrow("expired");
  });

  it("rejects a coupon that has hit its redemption cap", async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(makeCoupon({ maxRedemptions: 5, timesRedeemed: 5 }));

    await expect(couponService.validate("WELCOME20", "100.00")).rejects.toThrow("fully redeemed");
  });

  it("allows a coupon still under its redemption cap", async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(makeCoupon({ maxRedemptions: 5, timesRedeemed: 4 }));

    await expect(couponService.validate("WELCOME20", "100.00")).resolves.toBeDefined();
  });
});

describe("couponService.redeem", () => {
  it("delegates to the repository's atomic increment", async () => {
    await couponService.redeem("coupon-1");

    expect(couponRepository.incrementRedemptions).toHaveBeenCalledWith("coupon-1");
  });
});
