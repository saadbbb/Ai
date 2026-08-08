import { NextResponse } from "next/server";
import { orderFollowupService } from "@/features/orders/services/order-followup.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — PART 5's Follow-up
 * Engine example: reminds the customer and the workspace about orders left
 * incomplete ("draft"/"pending") for too long.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await orderFollowupService.runDailyCheck();
  return NextResponse.json({ ok: true, ...result });
}
