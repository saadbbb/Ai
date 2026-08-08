import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const couponTypeEnum = pgEnum("coupon_type", ["percentage", "fixed"]);

/**
 * Global, not per-workspace — a platform admin creates one coupon code that
 * any workspace can redeem once when its subscription is activated (see
 * invoice.service.ts). "fixed" amounts are interpreted in the target
 * subscription's own plan currency, so no currency column is needed here.
 */
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  type: couponTypeEnum("type").notNull(),
  // "percentage": 0-100. "fixed": a flat amount off, in the plan's currency.
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  maxRedemptions: integer("max_redemptions"),
  timesRedeemed: integer("times_redeemed").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponType = (typeof couponTypeEnum.enumValues)[number];
