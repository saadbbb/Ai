import "server-only";
import type { Campaign, Contact, ContactLifecycleStage } from "@/db/schema";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { emailService } from "@/lib/email";
import { AppError } from "@/lib/errors/app-error";
import { campaignRepository } from "../repository/campaign.repository";
import { churnRiskRepository } from "../repository/churn-risk.repository";
import { calculateChurnRisk, type ChurnRiskResult } from "../lib/churn-risk";

interface CreateCampaignInput {
  name: string;
  subject: string;
  message: string;
  segmentLifecycleStage?: ContactLifecycleStage;
  segmentTag?: string;
}

export interface ChurnRiskRow {
  contact: Contact;
  risk: ChurnRiskResult;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
}

async function listCampaigns(workspaceId: string): Promise<Campaign[]> {
  return campaignRepository.findByWorkspaceId(workspaceId);
}

async function createCampaign(workspaceId: string, input: CreateCampaignInput): Promise<Campaign> {
  return campaignRepository.create({
    workspaceId,
    name: input.name,
    subject: input.subject,
    message: input.message,
    segmentLifecycleStage: input.segmentLifecycleStage ?? null,
    segmentTag: input.segmentTag ?? null,
  });
}

/** Same segment a campaign will actually reach — contacts matching the filter who have an email on file, since email is the only real send channel today. */
async function previewRecipients(
  workspaceId: string,
  filters: { lifecycleStage?: ContactLifecycleStage; tag?: string },
): Promise<Contact[]> {
  const contacts = await contactRepository.findByWorkspaceId(workspaceId, filters);
  return contacts.filter((contact) => !!contact.email);
}

/**
 * Best-effort per recipient — one bad email address never blocks the rest of
 * the send. Each successful send is logged as a per-contact activity (same
 * "one row per business event" pattern activities.ts already establishes)
 * so a campaign's reach is visible on every reached contact's own timeline,
 * not just a workspace-wide count.
 */
async function sendCampaign(workspaceId: string, campaignId: string): Promise<Campaign> {
  const campaign = await campaignRepository.findById(campaignId, workspaceId);
  if (!campaign) throw new AppError("NOT_FOUND", "Campaign not found.");
  if (campaign.status === "sent") throw new AppError("VALIDATION_ERROR", "This campaign has already been sent.");

  const recipients = await previewRecipients(workspaceId, {
    lifecycleStage: campaign.segmentLifecycleStage ?? undefined,
    tag: campaign.segmentTag ?? undefined,
  });

  let sentCount = 0;
  for (const contact of recipients) {
    try {
      await emailService.sendNotificationEmail({ to: contact.email as string, subject: campaign.subject, text: campaign.message });
      sentCount += 1;
      await activityRepository.log({
        workspaceId,
        contactId: contact.id,
        type: "campaign_message_sent",
        actor: { type: "system" },
        summary: `Received campaign "${campaign.name}".`,
      });
    } catch (error) {
      console.error(`[campaigns] failed to email contact ${contact.id} for campaign ${campaignId}:`, error);
    }
  }

  const updated = await campaignRepository.markSent(campaignId, workspaceId, sentCount);
  return updated ?? campaign;
}

/** Every past-lead-stage contact, ranked highest-risk-first — feeds the "who to target with a win-back campaign" list. */
async function listChurnRisk(workspaceId: string): Promise<ChurnRiskRow[]> {
  const candidates = await churnRiskRepository.findCandidates(workspaceId);

  const rows = candidates.map(({ contact, lastOrderAt }) => ({
    contact,
    risk: calculateChurnRisk({
      daysSinceLastOrder: daysSince(lastOrderAt),
      daysSinceLastContact: daysSince(contact.lastContactAt),
    }),
  }));

  return rows.sort((a, b) => b.risk.score - a.risk.score);
}

export const campaignService = {
  listCampaigns,
  createCampaign,
  previewRecipients,
  sendCampaign,
  listChurnRisk,
};
