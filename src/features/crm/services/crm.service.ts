import "server-only";
import type { Lead, LeadStage } from "@/db/schema";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { AppError } from "@/lib/errors/app-error";
import { leadRepository, type LeadListItem } from "../repository/lead.repository";

async function listLeads(workspaceId: string): Promise<LeadListItem[]> {
  return leadRepository.findByWorkspaceId(workspaceId);
}

/**
 * Idempotent — clicking "Create lead" twice on the same conversation returns
 * the lead that's already there instead of raising a second one.
 */
async function createLeadFromConversation(workspaceId: string, conversationId: string): Promise<Lead> {
  const existing = await leadRepository.findByConversationId(conversationId, workspaceId);
  if (existing) return existing;

  const conversation = await conversationRepository.findById(conversationId, workspaceId);
  if (!conversation) {
    throw new AppError("NOT_FOUND", "Conversation not found.");
  }

  return leadRepository.create({
    workspaceId,
    contactId: conversation.contact.id,
    conversationId,
  });
}

async function updateLeadStage(workspaceId: string, leadId: string, stage: LeadStage): Promise<Lead> {
  const lead = await leadRepository.updateStage(leadId, workspaceId, stage);
  if (!lead) {
    throw new AppError("NOT_FOUND", "Lead not found.");
  }
  return lead;
}

export const crmService = {
  listLeads,
  createLeadFromConversation,
  updateLeadStage,
};
