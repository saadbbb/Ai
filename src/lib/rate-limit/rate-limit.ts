import "server-only";
import { rateLimitRepository } from "./rate-limit.repository";

/**
 * Fixed-window check-and-increment. Call once per attempt; returns false
 * once `max` has been hit within `windowSeconds` of the first attempt in
 * the current window. Not IP-based — keyed by whatever the caller passes
 * (typically an email address for auth flows), so pair with per-account
 * throttling rather than global request throttling.
 */
export async function checkRateLimit(key: string, opts: { windowSeconds: number; max: number }): Promise<boolean> {
  const count = await rateLimitRepository.hit(key, opts.windowSeconds);
  return count <= opts.max;
}
