import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { type Coupon, coupons, type NewCoupon } from "@/db/schema";

export const couponRepository = {
  async findAll(): Promise<Coupon[]> {
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  },

  async findByCode(code: string): Promise<Coupon | null> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    return coupon ?? null;
  },

  async create(data: NewCoupon): Promise<Coupon> {
    const [coupon] = await db.insert(coupons).values(data).returning();
    return coupon;
  },

  async setActive(id: string, isActive: boolean): Promise<Coupon | null> {
    const [coupon] = await db.update(coupons).set({ isActive, updatedAt: new Date() }).where(eq(coupons.id, id)).returning();
    return coupon ?? null;
  },

  /** Atomic increment — avoids a read-modify-write race if two activations redeem the same code at once. */
  async incrementRedemptions(id: string): Promise<void> {
    await db
      .update(coupons)
      .set({ timesRedeemed: sql`${coupons.timesRedeemed} + 1`, updatedAt: new Date() })
      .where(eq(coupons.id, id));
  },
};
