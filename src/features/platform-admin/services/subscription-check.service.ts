import "server-only";
import type { Workspace } from "@/db/schema";
import { userRepository } from "@/features/auth/repository/user.repository";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { emailService } from "@/lib/email";
import { platformSettingsRepository } from "../repository/platform-settings.repository";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";

const REMINDER_DAYS = [3, 2, 1];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * In-app (notifications table) and email are independent channels here —
 * the in-app one always gets created even if the email fails, which matters
 * today specifically because Resend is still in sandbox mode (see
 * DEFERRED_TASKS.md) and can't actually deliver to real customer inboxes yet.
 */
async function sendExpiryReminder(workspace: Workspace, daysLeft: number): Promise<void> {
  const dayWord = daysLeft === 1 ? "day" : "days";
  const isTrial = workspace.subscriptionStatus === "trial";
  const subjectLine = isTrial
    ? `Your free trial ends in ${daysLeft} ${dayWord}`
    : `Your subscription expires in ${daysLeft} ${dayWord}`;
  const bodyLine = isTrial
    ? `Your free trial for "${workspace.name}" ends in ${daysLeft} ${dayWord}. Subscribe to a plan to keep using your AI employee without interruption.`
    : `Your subscription for "${workspace.name}" expires in ${daysLeft} ${dayWord}. Renew to avoid any interruption.`;

  await notificationRepository.create({
    workspaceId: workspace.id,
    type: "subscription_expiring",
    title: subjectLine,
    message: bodyLine,
    link: "/dashboard/billing",
  });

  try {
    const ownerUserId = await membershipRepository.findOwnerUserId(workspace.id);
    const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;
    if (!owner) return;

    const settings = await platformSettingsRepository.get();
    const contactLine = settings?.whatsappNumber
      ? `\n\nWhatsApp: https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}`
      : "";

    await emailService.sendNotificationEmail({
      to: owner.email,
      subject: subjectLine,
      text: `Hi,\n\n${bodyLine}${contactLine}`,
    });
  } catch (error) {
    console.error(`[subscription-check] reminder email failed for workspace ${workspace.id}:`, error);
  }
}

async function notifySuspended(workspace: Workspace): Promise<void> {
  const isTrial = workspace.subscriptionStatus === "trial";
  await notificationRepository.create({
    workspaceId: workspace.id,
    type: "subscription_suspended",
    title: isTrial ? "Your free trial has ended" : "Your subscription has been suspended",
    message: isTrial
      ? `"${workspace.name}"'s free trial has ended. Subscribe to a plan to keep using your AI employee.`
      : `"${workspace.name}"'s subscription expired and wasn't renewed in time. Contact us to reactivate it.`,
    link: "/dashboard/billing",
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
        await notifySuspended(workspace);
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
