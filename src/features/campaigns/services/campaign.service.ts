import "server-only";
import type { Campaign, Contact, ContactLifecycleStage } from "@/db/schema";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { emailService } from "@/lib/email";
import { AppError } from "@/lib/errors/app-error";
import { getAppUrl } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { campaignRepository } from "../repository/campaign.repository";
import { churnRiskRepository } from "../repository/churn-risk.repository";
import { calculateChurnRisk, type ChurnRiskResult } from "../lib/churn-risk";

interface CreateCampaignInput {
  name: string;
  subject: string;
  message: string;
  segmentLifecycleStage?: ContactLifecycleStage;
  segmentTag?: string;
  segmentChurnRisk?: boolean;
}

interface CampaignActor {
  userId: string;
  email: string;
}

/** {{contactName}} is the one variable supported today — the same "small, real, no over-engineering" bar as automation's own message actions. */
function applyTemplateVariables(message: string, contact: Contact): string {
  return message.replaceAll("{{contactName}}", contact.fullName);
}

function unsubscribeFooter(workspaceId: string, contactId: string): string {
  return `\n\n---\nDon't want these emails? Unsubscribe: ${getAppUrl()}/unsubscribe/${workspaceId}/${contactId}`;
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
    segmentChurnRisk: input.segmentChurnRisk ?? false,
  });
}

/** Same segment a campaign will actually reach — contacts matching the filter, opted in, with an email on file, since email is the one real send channel today. */
async function previewRecipients(
  workspaceId: string,
  filters: { lifecycleStage?: ContactLifecycleStage; tag?: string; churnRisk?: boolean },
): Promise<Contact[]> {
  if (filters.churnRisk) {
    const rows = await listChurnRisk(workspaceId);
    return rows.filter((row) => row.risk.level === "high" && !!row.contact.email && !row.contact.marketingOptOut).map((row) => row.contact);
  }

  const contacts = await contactRepository.findByWorkspaceId(workspaceId, {
    lifecycleStage: filters.lifecycleStage,
    tag: filters.tag,
  });
  return contacts.filter((contact) => !!contact.email && !contact.marketingOptOut);
}

/**
 * Best-effort per recipient — one bad email address never blocks the rest of
 * the send. Each successful send is logged as a per-contact activity (same
 * "one row per business event" pattern activities.ts already establishes)
 * so a campaign's reach is visible on every reached contact's own timeline,
 * not just a workspace-wide count. Rate-limited per workspace (Compliance &
 * Rate-Limit Engine depth, PART 13 gap #173) so a compromised or careless
 * account can't blast every contact on file over and over.
 */
async function sendCampaign(workspaceId: string, campaignId: string, actor: CampaignActor): Promise<Campaign> {
  const campaign = await campaignRepository.findById(campaignId, workspaceId);
  if (!campaign) throw new AppError("NOT_FOUND", "Campaign not found.");
  if (campaign.status === "sent") throw new AppError("VALIDATION_ERROR", "This campaign has already been sent.");

  const allowed = await checkRateLimit(`campaign-send:${workspaceId}`, { windowSeconds: 60 * 60 * 24, max: 20 });
  if (!allowed) throw new AppError("RATE_LIMITED", "Too many campaigns sent today. Please try again tomorrow.");

  const recipients = await previewRecipients(workspaceId, {
    lifecycleStage: campaign.segmentLifecycleStage ?? undefined,
    tag: campaign.segmentTag ?? undefined,
    churnRisk: campaign.segmentChurnRisk,
  });

  let sentCount = 0;
  for (const contact of recipients) {
    try {
      const personalizedMessage = applyTemplateVariables(campaign.message, contact) + unsubscribeFooter(workspaceId, contact.id);
      await emailService.sendNotificationEmail({ to: contact.email as string, subject: campaign.subject, text: personalizedMessage });
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

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: "campaign_sent",
    targetType: "campaign",
    targetId: campaignId,
    summary: `Sent campaign "${campaign.name}" to ${sentCount} recipient(s).`,
  });

  return updated ?? campaign;
}

/** Sets/clears the opt-out flag from the unsubscribe link in a campaign email's footer — public, zero-auth by design (see unsubscribeFooter). */
async function setMarketingOptOut(workspaceId: string, contactId: string, optOut: boolean): Promise<void> {
  await contactRepository.update(contactId, workspaceId, { marketingOptOut: optOut });
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
  setMarketingOptOut,
  listChurnRisk,
};
