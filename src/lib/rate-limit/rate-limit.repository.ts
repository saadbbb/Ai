import "server-only";
import { desc, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { type RateLimitBucket, rateLimitBuckets } from "@/db/schema";

export const rateLimitRepository = {
  /** Feeds the Super Admin AI Operations page's rate-limit visibility (PART 9 gap) — the busiest buckets with a window still open in the last hour, across every key namespace (login/OTP/API keys/etc), not just AI. */
  async findMostActive(limit = 20): Promise<RateLimitBucket[]> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    return db
      .select()
      .from(rateLimitBuckets)
      .where(gte(rateLimitBuckets.windowStart, since))
      .orderBy(desc(rateLimitBuckets.count))
      .limit(limit);
  },

  /**
   * Atomic fixed-window increment: resets to 1 if the existing bucket's
   * window has expired, otherwise increments it — one round trip, race-free
   * under concurrent requests via Postgres's INSERT ... ON CONFLICT.
   */
  async hit(key: string, windowSeconds: number): Promise<number> {
    const [row] = await db
      .insert(rateLimitBuckets)
      .values({ key, count: 1, windowStart: new Date() })
      .onConflictDoUpdate({
        target: rateLimitBuckets.key,
        set: {
          count: sql`case when ${rateLimitBuckets.windowStart} < now() - make_interval(secs => ${windowSeconds}) then 1 else ${rateLimitBuckets.count} + 1 end`,
          windowStart: sql`case when ${rateLimitBuckets.windowStart} < now() - make_interval(secs => ${windowSeconds}) then now() else ${rateLimitBuckets.windowStart} end`,
        },
      })
      .returning({ count: rateLimitBuckets.count });
    return row.count;
  },
};
