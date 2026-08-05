import "server-only";
import type { Workspace } from "@/db/schema";
import { userRepository } from "@/features/auth/repository/user.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { emailService } from "@/lib/email";
import { platformSettingsRepository } from "../repository/platform-settings.repository";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";

const REMINDER_DAYS = [3, 2, 1];
const DAY_MS = 24 * 60 * 60 * 1000;

async function sendExpiryReminder(workspace: Workspace, daysLeft: number): Promise<void> {
  const ownerUserId = await membershipRepository.findOwnerUserId(workspace.id);
  const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;
  if (!owner) return;

  const settings = await platformSettingsRepository.get();
  const contactLine = settings?.whatsappNumber
    ? `\n\nWhatsApp: https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}`
    : "";

  await emailService.sendNotificationEmail({
    to: owner.email,
    subject: `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    text: `Hi,\n\nYour subscription for "${workspace.name}" expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Get in touch to renew and avoid any interruption.${contactLine}`,
  });
}

export interface SubscriptionCheckResult {
  checked: number;
  remindersSent: number;
  suspended: number;
}

/**
 * Runs once a day via the /api/cron/subscription-check route (see vercel.json).
 * Never throws for a single workspace's failure — one bad email shouldn't
 * stop the rest of the batch from being checked.
 */
async function runDailyCheck(): Promise<SubscriptionCheckResult> {
  const workspaces = await workspaceAdminRepository.findActiveWithExpiry();
  let remindersSent = 0;
  let suspended = 0;

  for (const workspace of workspaces) {
    try {
      const daysLeft = Math.ceil((workspace.subscriptionExpiresAt!.getTime() - Date.now()) / DAY_MS);

      if (daysLeft <= 0) {
        await workspaceAdminRepository.updateSubscriptionStatus(workspace.id, "suspended");
        suspended += 1;
        continue;
      }

      if (REMINDER_DAYS.includes(daysLeft) && workspace.lastReminderDaysSent !== daysLeft) {
        await sendExpiryReminder(workspace, daysLeft);
        await workspaceAdminRepository.setReminderSent(workspace.id, daysLeft);
        remindersSent += 1;
      }
    } catch (error) {
      console.error(`[subscription-check] failed for workspace ${workspace.id}:`, error);
    }
  }

  return { checked: workspaces.length, remindersSent, suspended };
}

export const subscriptionCheckService = {
  runDailyCheck,
};
