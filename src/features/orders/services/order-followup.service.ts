import "server-only";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { emailService } from "@/lib/email";
import { orderGrandTotal } from "../lib/order-total";
import { orderRepository } from "../repository/order.repository";

const STALE_ORDER_HOURS = 24;
const RENOTIFY_AFTER_DAYS = 3;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface OrderFollowupResult {
  notified: number;
}

/**
 * Runs once a day via /api/cron/order-followups (see vercel.json) — PART 5's
 * Follow-up Engine "abandoned/incomplete order" case: an order left in
 * "draft" or "pending" for over a day without progressing. Emails the
 * customer directly when they have an address on file, and always leaves an
 * in-app notification for the workspace. Never throws for a single order's
 * failure, same pattern as the other daily crons.
 */
async function runDailyCheck(): Promise<OrderFollowupResult> {
  const createdBefore = new Date(Date.now() - STALE_ORDER_HOURS * HOUR_MS);
  const renotifyBefore = new Date(Date.now() - RENOTIFY_AFTER_DAYS * DAY_MS);
  const stale = await orderRepository.findStalePending(createdBefore, renotifyBefore);

  let notified = 0;
  for (const { order, contact, items } of stale) {
    try {
      const total = orderGrandTotal(items, order).toFixed(2);

      if (contact.email) {
        await emailService.sendNotificationEmail({
          to: contact.email,
          subject: "Complete your order",
          text: `Hi ${contact.fullName},\n\nYou still have an order (total: ${total}) waiting to be completed. Reply to this message if you'd like to finish it or need any help.\n\nThanks!`,
        });
      }

      await notificationRepository.create({
        workspaceId: order.workspaceId,
        type: "order_followup",
        title: `Incomplete order: ${contact.fullName}`,
        message: `${contact.fullName} has an order (total: ${total}) still in "${order.status}" status.`,
        link: `/dashboard/orders/${order.id}`,
      });
      await orderRepository.markFollowupNotified(order.id);
      notified += 1;
    } catch (error) {
      console.error(`[order-followups] failed for order ${order.id}:`, error);
    }
  }

  return { notified };
}

export const orderFollowupService = {
  runDailyCheck,
};
