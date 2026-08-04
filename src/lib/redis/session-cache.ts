import "server-only";
import type { Session } from "@/db/schema";
import { redis } from "./client";

/**
 * Fast lookup cache in front of the `sessions` table. The TTL is capped well below the
 * session's real expiry so a missed invalidation (e.g. logout) only leaves a stale cache
 * entry for a bounded window instead of indefinitely.
 */
const MAX_TTL_SECONDS = 300;

const keyFor = (sessionId: string) => `session:${sessionId}`;

export async function getCachedSession(sessionId: string): Promise<Session | null> {
  try {
    const raw = await redis.get(keyFor(sessionId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Session;
    return {
      ...parsed,
      expiresAt: new Date(parsed.expiresAt),
      createdAt: new Date(parsed.createdAt),
      lastUsedAt: new Date(parsed.lastUsedAt),
    };
  } catch {
    return null;
  }
}

export async function setCachedSession(session: Session): Promise<void> {
  const ttlSeconds = Math.min(MAX_TTL_SECONDS, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
  if (ttlSeconds <= 0) return;

  try {
    await redis.set(keyFor(session.id), JSON.stringify(session), "EX", ttlSeconds);
  } catch {
    // Cache is a performance optimization only; failures must not break authentication.
  }
}

export async function invalidateCachedSession(sessionId: string): Promise<void> {
  try {
    await redis.del(keyFor(sessionId));
  } catch {
    // best-effort
  }
}
