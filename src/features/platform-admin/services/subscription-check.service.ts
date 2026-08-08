import "server-only";
import type { SubscriptionStatus, Workspace } from "@/db/schema";
import { userRepository } from "@/features/auth/repository/user.repository";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { emailService } from "@/lib/email";
import { platformSettingsRepository } from "../repository/platform-settings.repository";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";

const REMINDER_DAYS = [3, 2, 1];
const DAY_MS = 24 * 60 * 60 * 1000;

// The lifecycle's day boundaries past subscriptionExpiresAt — see the
// subscriptionStatusEnum comment in db/schema/workspaces.ts for the full
// picture. Named constants so "why 3? why 7?" lives in one place.
const PAST_DUE_UNTIL_DAY = 3; // days 0-2 past expiry: past_due
const GRACE_UNTIL_DAY = 7; // days 3-6 past expiry: grace; day 7+: suspended
const EXPIRED_AFTER_SUSPENDED_DAYS = 90; // suspended for this many more days -> expired

/**
 * In-app (notifications table) and email are independent channels here —
 * the in-app one always gets created even if the email fails, which matters
 * today specifically because Resend is still in sandbox mode (see
 * DEFERRED_TASKS.md) and can't actually deliver to real customer inboxes yet.
 */
async function emailOwnerBestEffort(workspace: Workspace, subject: string, body: string): Promise<void> {
  try {
    const ownerUserId = await membershipRepository.findOwnerUserId(workspace.id);
    const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;
    if (!owner) return;

    const settings = await platformSettingsRepository.get();
    const contactLine = settings?.whatsappNumber
      ? `\n\nWhatsApp: https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}`
      : "";

    await emailService.sendNotificationEmail({ to: owner.email, subject, text: `Hi,\n\n${body}${contactLine}` });
  } catch (error) {
    console.error(`[subscription-check] reminder email failed for workspace ${workspace.id}:`, error);
  }
}

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
  await emailOwnerBestEffort(workspace, subjectLine, bodyLine);
}

async function notifyOverdue(workspace: Workspace, status: Extract<SubscriptionStatus, "past_due" | "grace">): Promise<void> {
  const title = status === "past_due" ? "Your subscription payment is overdue" : "Final notice: renew to avoid suspension";
  const message =
    status === "past_due"
      ? `"${workspace.name}"'s subscription expired and hasn't been renewed yet. Renew soon to avoid any interruption.`
      : `"${workspace.name}"'s subscription is still overdue. It will be suspended soon if it isn't renewed.`;

  await notificationRepository.create({ workspaceId: workspace.id, type: "subscription_expiring", title, message, link: "/dashboard/billing" });
  await emailOwnerBestEffort(workspace, title, message);
}

async function notifySuspended(workspace: Workspace): Promise<void> {
  // Not workspace.subscriptionStatus === "trial" — by the time a lapsed trial
  // reaches "suspended" it's already passed through past_due/grace, so the
  // status field no longer says "trial" here. A trial never gets a planId
  // (only activateSubscription sets one), so that's the stable signal instead.
  const isTrial = !workspace.planId;
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
  statusChanges: number;
  suspended: number;
}

/**
 * Runs once a day via the /api/cron/subscription-check route (see vercel.json).
 * Walks each workspace through the lifecycle one step at a time based on how
 * many days have passed since subscriptionExpiresAt — never throws for a
 * single workspace's failure, since one bad email shouldn't stop the rest of
 * the batch from being checked.
 */
async function runDailyCheck(): Promise<SubscriptionCheckResult> {
  const workspaces = await workspaceAdminRepository.findActiveWithExpiry();
  let remindersSent = 0;
  let suspended = 0;
  let statusChanges = 0;

  for (const workspace of workspaces) {
    try {
      const daysSinceExpiry = Math.floor((Date.now() - workspace.subscriptionExpiresAt!.getTime()) / DAY_MS);

      if (daysSinceExpiry < 0) {
        // Not expired yet — the existing 3/2/1-day countdown reminder.
        const daysLeft = -daysSinceExpiry;
        if (REMINDER_DAYS.includes(daysLeft) && workspace.lastReminderDaysSent !== daysLeft) {
          await sendExpiryReminder(workspace, daysLeft);
          await workspaceAdminRepository.setReminderSent(workspace.id, daysLeft);
          remindersSent += 1;
        }
        continue;
      }

      let nextStatus: SubscriptionStatus;
      if (daysSinceExpiry < PAST_DUE_UNTIL_DAY) nextStatus = "past_due";
      else if (daysSinceExpiry < GRACE_UNTIL_DAY) nextStatus = "grace";
      else if (daysSinceExpiry < GRACE_UNTIL_DAY + EXPIRED_AFTER_SUSPENDED_DAYS) nextStatus = "suspended";
      else nextStatus = "expired";

      if (nextStatus === workspace.subscriptionStatus) continue;

      await workspaceAdminRepository.updateSubscriptionStatus(workspace.id, nextStatus);
      statusChanges += 1;

      if (nextStatus === "past_due" || nextStatus === "grace") {
        await notifyOverdue(workspace, nextStatus);
      } else if (nextStatus === "suspended") {
        await notifySuspended(workspace);
        suspended += 1;
      }
      // "expired" is a silent record-keeping transition — the workspace was
      // already suspended (and already notified) for 90 days before reaching it.
    } catch (error) {
      console.error(`[subscription-check] failed for workspace ${workspace.id}:`, error);
    }
  }

  return { checked: workspaces.length, remindersSent, statusChanges, suspended };
}

export const subscriptionCheckService = {
  runDailyCheck,
};
