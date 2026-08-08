import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { redis } from "@/lib/redis/client";

export type SystemHealthStatus = "ok" | "degraded" | "not_configured";

export interface SystemHealthCheck {
  status: SystemHealthStatus;
  latencyMs: number | null;
  detail?: string;
}

export interface SystemHealthReport {
  database: SystemHealthCheck;
  redis: SystemHealthCheck;
  queue: SystemHealthCheck;
  email: SystemHealthCheck;
}

async function timed(fn: () => Promise<void>): Promise<{ latencyMs: number }> {
  const start = Date.now();
  await fn();
  return { latencyMs: Date.now() - start };
}

async function checkDatabase(): Promise<SystemHealthCheck> {
  try {
    const { latencyMs } = await timed(async () => {
      await db.execute(sql`select 1`);
    });
    return { status: "ok", latencyMs };
  } catch (error) {
    return { status: "degraded", latencyMs: null, detail: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Same REDIS_URL backs both the session cache and the BullMQ automation
 * queue (see lib/queue/connection.ts's own comment on why it's a separate
 * client instance) — a single reachability check covers both concerns.
 * "not_configured" isn't a failure: Redis is optional and everything using
 * it degrades gracefully without it (session cache falls back to Postgres,
 * automation dispatch falls back to running inline).
 */
async function checkRedis(): Promise<SystemHealthCheck> {
  const client = redis;
  if (!client) return { status: "not_configured", latencyMs: null, detail: "REDIS_URL not set — features fall back gracefully." };

  try {
    const { latencyMs } = await timed(async () => {
      await client.ping();
    });
    return { status: "ok", latencyMs };
  } catch (error) {
    return { status: "degraded", latencyMs: null, detail: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * The queue itself is only as healthy as the Redis it's backed by — there's
 * no separate liveness signal for it. Whether a worker is actually consuming
 * it (`pnpm run worker`) isn't something this process can observe; see
 * DEFERRED_TASKS.md for that still-open deployment decision.
 */
async function checkQueue(redisCheck: SystemHealthCheck): Promise<SystemHealthCheck> {
  if (redisCheck.status === "not_configured") {
    return { status: "not_configured", latencyMs: null, detail: "No REDIS_URL — automation events run inline instead of queued." };
  }
  return redisCheck;
}

async function checkEmail(): Promise<SystemHealthCheck> {
  if (!process.env.RESEND_API_KEY) {
    return { status: "not_configured", latencyMs: null, detail: "RESEND_API_KEY not set — emails log to the console instead of sending." };
  }
  return { status: "ok", latencyMs: null, detail: "Resend configured." };
}

async function getReport(): Promise<SystemHealthReport> {
  const database = await checkDatabase();
  const redisCheck = await checkRedis();
  const [queue, email] = await Promise.all([checkQueue(redisCheck), checkEmail()]);

  return { database, redis: redisCheck, queue, email };
}

export const systemHealthService = {
  getReport,
};
