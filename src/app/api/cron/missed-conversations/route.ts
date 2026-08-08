import { NextResponse } from "next/server";
import { missedConversationService } from "@/features/inbox/services/missed-conversation.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — flags conversations a
 * human should be handling where the customer's last message has gone
 * unanswered for hours.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await missedConversationService.runDailyCheck();
  return NextResponse.json({ ok: true, ...result });
}
