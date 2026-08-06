import "server-only";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { leadRepository } from "../repository/lead.repository";

const STALE_CONTACT_DAYS = 7;
const RENOTIFY_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CrmFollowupResult {
  notified: number;
}

/**
 * Runs once a day via /api/cron/crm-followups (see vercel.json) — PART 5's Follow-up
 * Engine example: "Customer inactive for 7 days -> Suggest follow-up." Never throws
 * for a single lead's failure, same pattern as subscriptionCheckService.
 */
async function runDailyCheck(): Promise<CrmFollowupResult> {
  const staleContactBefore = new Date(Date.now() - STALE_CONTACT_DAYS * DAY_MS);
  const notifiedBefore = new Date(Date.now() - RENOTIFY_AFTER_DAYS * DAY_MS);
  const staleLeads = await leadRepository.findStaleOpenLeads(staleContactBefore, notifiedBefore);

  let notified = 0;
  for (const { lead, contact } of staleLeads) {
    try {
      await notificationRepository.create({
        workspaceId: lead.workspaceId,
        type: "crm_followup",
        title: `Follow up with ${contact.fullName}`,
        message: `${contact.fullName} hasn't been contacted in over a week and is still an open lead.`,
        link: `/dashboard/contacts/${contact.id}`,
      });
      await leadRepository.markFollowupNotified(lead.id);
      notified += 1;
    } catch (error) {
      console.error(`[crm-followups] failed for lead ${lead.id}:`, error);
    }
  }

  return { notified };
}

export const crmFollowupsService = {
  runDailyCheck,
};
