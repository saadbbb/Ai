import "server-only";
import Redis from "ioredis";

declare global {
  var __redisClient: Redis | undefined;
}

const redis =
  globalThis.__redisClient ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

redis.on("error", (error) => {
  console.error("[redis] connection error:", error.message);
});

if (process.env.NODE_ENV !== "production") {
  globalThis.__redisClient = redis;
}

export { redis };
