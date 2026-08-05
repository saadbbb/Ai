import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { rateLimitBuckets } from "@/db/schema";

export const rateLimitRepository = {
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
