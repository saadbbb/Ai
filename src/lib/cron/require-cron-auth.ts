import "server-only";
import { NextResponse } from "next/server";

/**
 * Shared bearer-auth check for the two Vercel Cron routes. Fails closed in
 * production: a missing CRON_SECRET env var now rejects every request
 * instead of silently letting them through unauthenticated (the previous
 * behavior — `if (secret) { check }` — treated "not configured" the same as
 * "no auth required"). Local dev keeps the permissive behavior so
 * `curl localhost:3000/api/cron/...` still works without setting the var.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
    }
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
