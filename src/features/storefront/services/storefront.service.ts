import "server-only";
import type { Storefront } from "@/db/schema";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { automationService } from "@/features/automation/services/automation.service";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { storefrontRepository } from "../repository/storefront.repository";

interface StorefrontInput {
  isPublished: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  contactPhone?: string;
  contactEmail?: string;
  primaryColor?: string;
}

interface InquiryInput {
  fullName: string;
  phone: string;
  message: string;
}

/** One row per workspace, created on first visit to the editor — same check-then-create pattern as ai_agents. */
async function getOrCreateForWorkspace(workspaceId: string): Promise<Storefront> {
  const existing = await storefrontRepository.findByWorkspaceId(workspaceId);
  if (existing) return existing;
  return storefrontRepository.create({ workspaceId });
}

async function updateStorefront(workspaceId: string, input: StorefrontInput): Promise<Storefront> {
  const existing = await getOrCreateForWorkspace(workspaceId);
  const updated = await storefrontRepository.update(existing.id, workspaceId, {
    isPublished: input.isPublished,
    heroTitle: input.heroTitle || null,
    heroSubtitle: input.heroSubtitle || null,
    aboutText: input.aboutText || null,
    contactPhone: input.contactPhone || null,
    contactEmail: input.contactEmail || null,
    primaryColor: input.primaryColor || null,
  });
  return updated ?? existing;
}

/**
 * The only write path in this app reachable with zero authentication — called
 * from a public Server Action on /store/[slug]. Dedupes by phone (the only
 * reliable identifier a public form collects) so a returning visitor doesn't
 * spawn a duplicate contact every time they inquire. Reuses the same
 * lead_created activity/automation wiring crmService.createLeadFromConversation
 * already established, with `source: "Website"` marking where it came from.
 */
async function submitInquiry(workspaceId: string, input: InquiryInput): Promise<void> {
  let contact = await contactRepository.findByPhone(input.phone, workspaceId);
  if (!contact) {
    contact = await contactRepository.create({
      workspaceId,
      fullName: input.fullName,
      phone: input.phone,
      source: "Website",
    });
  }

  const lead = await leadRepository.create({ workspaceId, contactId: contact.id, conversationId: null });

  await activityRepository.log({
    workspaceId,
    contactId: contact.id,
    type: "lead_created",
    actor: { type: "system" },
    summary: `Inquiry submitted via the storefront: "${input.message}"`,
  });

  await automationService.dispatch(workspaceId, { type: "lead_created", contactId: lead.contactId });
}

export const storefrontService = {
  getOrCreateForWorkspace,
  updateStorefront,
  submitInquiry,
};
