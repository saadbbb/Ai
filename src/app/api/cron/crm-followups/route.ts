import { NextResponse } from "next/server";
import { crmFollowupsService } from "@/features/crm/services/crm-followups.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — flags open leads whose
 * contact has gone quiet for a week so the owner can follow up.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await crmFollowupsService.runDailyCheck();
  return NextResponse.json({ ok: true, ...result });
}
