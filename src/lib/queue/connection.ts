import "server-only";
import Redis from "ioredis";

/**
 * A separate connection from src/lib/redis/client.ts — BullMQ requires
 * `maxRetriesPerRequest: null` (it manages blocking-command retries itself),
 * which is incompatible with the fail-fast options the general-purpose
 * session-cache client uses. `retryStrategy` still gives up after a couple
 * attempts so an unreachable Redis doesn't retry forever in the background.
 */
export function createQueueRedisConnection(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 2000,
    retryStrategy: (times) => (times > 2 ? null : 200),
  });

  connection.on("error", (error) => {
    console.error("[queue] redis connection error:", error.message);
  });

  return connection;
}
