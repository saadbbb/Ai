import { NextResponse } from "next/server";
import { inactiveMemberService } from "@/features/dashboard/services/inactive-member.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — flags team members who
 * haven't handled a conversation or completed a task in two weeks.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await inactiveMemberService.runDailyCheck();
  return NextResponse.json({ ok: true, ...result });
}
