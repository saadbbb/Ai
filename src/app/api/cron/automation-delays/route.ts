import { NextResponse } from "next/server";
import { automationService } from "@/features/automation/services/automation.service";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — drains
 * workflow_pending_runs for any workflow with a delayDays step whose delay
 * has elapsed. Same CRON_SECRET bearer-auth pattern as
 * subscription-check/route.ts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await automationService.processDueRuns();
  return NextResponse.json({ ok: true });
}
