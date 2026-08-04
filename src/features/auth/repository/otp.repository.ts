import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewOtpCode, type OtpCode, otpCodes } from "@/db/schema";

export const otpRepository = {
  async create(data: NewOtpCode): Promise<OtpCode> {
    const [otp] = await db.insert(otpCodes).values(data).returning();
    return otp;
  },

  async findLatestActive(email: string, purpose: OtpCode["purpose"]): Promise<OtpCode | null> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return otp ?? null;
  },

  async incrementAttempts(id: string): Promise<OtpCode> {
    const [otp] = await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, id))
      .returning();
    return otp;
  },

  async markConsumed(id: string): Promise<void> {
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, id));
  },

  async findRecentlyVerified(
    email: string,
    purpose: OtpCode["purpose"],
    maxAgeMs: number,
  ): Promise<OtpCode | null> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose), isNotNull(otpCodes.consumedAt)))
      .orderBy(desc(otpCodes.consumedAt))
      .limit(1);

    if (!otp?.consumedAt) return null;
    if (Date.now() - otp.consumedAt.getTime() > maxAgeMs) return null;
    return otp;
  },
};
