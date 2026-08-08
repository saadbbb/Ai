import { NextResponse } from "next/server";
import { usageWarningService } from "@/features/platform-admin/services/usage-warning.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/** Triggered daily by Vercel Cron (see vercel.json) — PART 8's usage-limit warnings. */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await usageWarningService.runDailyCheck();
  return NextResponse.json({ ok: true, ...result });
}
