import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Fixed-window rate limiting, DB-backed rather than Redis-backed — Redis
 * (REDIS_URL) isn't provisioned yet and degrades gracefully to a no-op when
 * absent (see src/lib/redis/session-cache.ts), which would make a
 * Redis-only limiter silently do nothing. Postgres is the store guaranteed
 * to be present. `key` is caller-defined, e.g. "login:user@example.com" or
 * "otp:user@example.com:registration".
 */
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

export type RateLimitBucket = typeof rateLimitBuckets.$inferSelect;
export type NewRateLimitBucket = typeof rateLimitBuckets.$inferInsert;
