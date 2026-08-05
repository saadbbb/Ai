import { NextResponse } from "next/server";
import { subscriptionCheckService } from "@/features/platform-admin/services/subscription-check.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/**
 * Triggered daily by Vercel Cron (see vercel.json). Vercel automatically
 * sends `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when
 * CRON_SECRET is set as a project env var — see DEFERRED_TASKS.md for the
 * one-time setup step.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await subscriptionCheckService.runDailyCheck();
  return NextResponse.json(result);
}
