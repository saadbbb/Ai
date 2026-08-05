import { NextResponse } from "next/server";
import { subscriptionCheckService } from "@/features/platform-admin/services/subscription-check.service";

/**
 * Triggered daily by Vercel Cron (see vercel.json). Vercel automatically
 * sends `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when
 * CRON_SECRET is set as a project env var — see DEFERRED_TASKS.md for the
 * one-time setup step. Without it set, the check still runs (so local
 * `curl localhost:3000/api/cron/subscription-check` works during
 * development) but the route is then unauthenticated — set the secret
 * before relying on this in production.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await subscriptionCheckService.runDailyCheck();
  return NextResponse.json(result);
}
