import { NextResponse } from "next/server";
import { automationService } from "@/features/automation/services/automation.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — drains
 * workflow_pending_runs for any workflow with a delayDays step whose delay
 * has elapsed.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  await automationService.processDueRuns();
  return NextResponse.json({ ok: true });
}
