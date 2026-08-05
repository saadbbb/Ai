import "server-only";
import Redis from "ioredis";

declare global {
  var __redisClient: Redis | null | undefined;
}

/**
 * REDIS_URL is not provisioned in every environment. Falling back to a localhost URL
 * (as this used to do) doesn't degrade gracefully in serverless — there's never a Redis
 * listening there, so every request would pay for a doomed connect-and-retry cycle. If
 * it's not configured, skip Redis entirely; session-cache.ts falls back to Postgres.
 */
function createClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  client.on("error", (error) => {
    console.error("[redis] connection error:", error.message);
  });

  return client;
}

const redis = globalThis.__redisClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__redisClient = redis;
}

export { redis };
