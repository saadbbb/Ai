import { NextResponse } from "next/server";
import { appointmentReminderService } from "@/features/appointments/services/appointment-reminder.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — reminds customers (by email,
 * when on file) and the workspace (in-app) about appointments coming up within 24h.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await appointmentReminderService.runDailyCheck();
  return NextResponse.json({ ok: true, ...result });
}
