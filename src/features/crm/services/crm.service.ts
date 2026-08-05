import "server-only";
import type { Lead, LeadStage } from "@/db/schema";
import { automationService } from "@/features/automation/services/automation.service";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { AppError } from "@/lib/errors/app-error";
import { activityRepository, type ActivityActor } from "../repository/activity.repository";
import { leadRepository, type LeadListItem } from "../repository/lead.repository";

async function listLeads(workspaceId: string): Promise<LeadListItem[]> {
  return leadRepository.findByWorkspaceId(workspaceId);
}

/**
 * Idempotent — clicking "Create lead" twice on the same conversation returns
 * the lead that's already there instead of raising a second one. No timeline
 * entry is logged on that early-return path — only a real creation is an event.
 */
async function createLeadFromConversation(workspaceId: string, conversationId: string, actor: ActivityActor): Promise<Lead> {
  const existing = await leadRepository.findByConversationId(conversationId, workspaceId);
  if (existing) return existing;

  const conversation = await conversationRepository.findById(conversationId, workspaceId);
  if (!conversation) {
    throw new AppError("NOT_FOUND", "Conversation not found.");
  }

  const lead = await leadRepository.create({
    workspaceId,
    contactId: conversation.contact.id,
    conversationId,
  });

  await automationService.dispatch(workspaceId, { type: "lead_created", contactId: lead.contactId });
  await activityRepository.log({
    workspaceId,
    contactId: lead.contactId,
    type: "lead_created",
    actor,
    summary: "Lead created.",
  });

  return lead;
}

async function updateLeadStage(workspaceId: string, leadId: string, stage: LeadStage, actor: ActivityActor): Promise<Lead> {
  const lead = await leadRepository.updateStage(leadId, workspaceId, stage);
  if (!lead) {
    throw new AppError("NOT_FOUND", "Lead not found.");
  }

  await automationService.dispatch(workspaceId, {
    type: "lead_stage_changed",
    contactId: lead.contactId,
    stage,
  });
  await activityRepository.log({
    workspaceId,
    contactId: lead.contactId,
    type: "lead_stage_changed",
    actor,
    summary: `Lead stage changed to "${stage}".`,
  });

  return lead;
}

export const crmService = {
  listLeads,
  createLeadFromConversation,
  updateLeadStage,
};
