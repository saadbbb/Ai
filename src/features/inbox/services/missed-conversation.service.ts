import "server-only";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { conversationRepository } from "../repository/conversation.repository";

const STALE_HOURS = 4;
const RENOTIFY_AFTER_HOURS = 4;
const HOUR_MS = 60 * 60 * 1000;

export interface MissedConversationResult {
  notified: number;
}

/**
 * Runs once a day via /api/cron/missed-conversations (see vercel.json) —
 * PART 4's Notifications "missed conversation" trigger: a conversation a
 * human is (or should be) handling where the customer spoke last and nobody
 * has replied in hours. Never throws for a single conversation's failure,
 * same pattern as the other daily crons.
 */
async function runDailyCheck(): Promise<MissedConversationResult> {
  const staleBefore = new Date(Date.now() - STALE_HOURS * HOUR_MS);
  const renotifyBefore = new Date(Date.now() - RENOTIFY_AFTER_HOURS * HOUR_MS);
  const missed = await conversationRepository.findMissedForNotification(staleBefore, renotifyBefore);

  let notified = 0;
  for (const { conversation, contact } of missed) {
    try {
      await notificationRepository.create({
        workspaceId: conversation.workspaceId,
        type: "missed_conversation",
        title: `Missed conversation: ${contact.fullName}`,
        message: `${contact.fullName} hasn't had a reply in a while and is waiting on a human.`,
        link: `/dashboard/inbox/${conversation.id}`,
      });
      await conversationRepository.markMissedNotified(conversation.id);
      notified += 1;
    } catch (error) {
      console.error(`[missed-conversations] failed for conversation ${conversation.id}:`, error);
    }
  }

  return { notified };
}

export const missedConversationService = {
  runDailyCheck,
};
