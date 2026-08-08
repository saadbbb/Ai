import { NextResponse } from "next/server";
import { taskReminderService } from "@/features/crm/services/task-reminder.service";
import { requireCronAuth } from "@/lib/cron/require-cron-auth";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — nudges the workspace
 * about open tasks that are due today or overdue.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const result = await taskReminderService.runDailyCheck();
  return NextResponse.json({ ok: true, ...result });
}
