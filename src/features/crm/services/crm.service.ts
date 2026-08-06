import "server-only";
import type { ContactLifecycleStage, Lead, LeadStage } from "@/db/schema";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { automationService } from "@/features/automation/services/automation.service";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { messageRepository } from "@/features/inbox/repository/message.repository";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { AppError } from "@/lib/errors/app-error";
import { activityRepository, type ActivityActor } from "../repository/activity.repository";
import { leadRepository, type LeadFilters, type LeadListItem } from "../repository/lead.repository";
import { calculateLeadScore } from "../lib/lead-score";

const REVENUE_ORDER_STATUSES = ["delivered", "completed"];
const LOYAL_THRESHOLD = 5;
const REPEAT_THRESHOLD = 2;
const LIFECYCLE_RANK: Record<ContactLifecycleStage, number> = {
  lead: 0,
  customer: 1,
  repeat_customer: 2,
  vip: 3,
  loyal_customer: 4,
};

export interface LeadListItemWithScore extends LeadListItem {
  score: number;
}

/**
 * One grouped query per signal (messages/orders/appointments) rather than a
 * per-lead lookup — see the repository methods this calls for why.
 */
async function listLeads(workspaceId: string, filters?: LeadFilters): Promise<LeadListItemWithScore[]> {
  const items = await leadRepository.findByWorkspaceId(workspaceId, filters);
  if (items.length === 0) return [];

  const conversationIds = items
    .map((item) => item.lead.conversationId)
    .filter((id): id is string => id !== null);
  const contactIds = [...new Set(items.map((item) => item.contact.id))];

  const [messageCounts, contactsWithOrders, contactsWithAppointments] = await Promise.all([
    messageRepository.countByConversationIds(conversationIds),
    orderRepository.findContactIdsWithOrders(workspaceId, contactIds),
    appointmentRepository.findContactIdsWithAppointments(workspaceId, contactIds),
  ]);

  return items.map((item) => ({
    ...item,
    score: calculateLeadScore({
      messageCount: item.lead.conversationId ? (messageCounts.get(item.lead.conversationId) ?? 0) : 0,
      hasOrder: contactsWithOrders.has(item.contact.id),
      hasAppointment: contactsWithAppointments.has(item.contact.id),
      tags: item.contact.tags,
      stage: item.lead.stage,
      lastContactAt: item.contact.lastContactAt,
    }),
  }));
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

/**
 * Part 5's Customer Lifecycle auto-advance — called after an order reaches a
 * revenue-counting status. Only ever moves forward (never demotes a
 * manually-set "vip" back to "customer" just because this recomputed a lower
 * rank) — see LIFECYCLE_RANK.
 */
async function advanceLifecycleStage(workspaceId: string, contactId: string): Promise<void> {
  const contact = await contactRepository.findById(contactId, workspaceId);
  if (!contact) return;

  const orders = await orderRepository.findByContactId(contactId, workspaceId);
  const completedCount = orders.filter((item) => REVENUE_ORDER_STATUSES.includes(item.order.status)).length;

  let nextStage: ContactLifecycleStage = contact.lifecycleStage;
  if (completedCount >= LOYAL_THRESHOLD) nextStage = "loyal_customer";
  else if (completedCount >= REPEAT_THRESHOLD) nextStage = "repeat_customer";
  else if (completedCount >= 1) nextStage = "customer";

  if (LIFECYCLE_RANK[nextStage] > LIFECYCLE_RANK[contact.lifecycleStage]) {
    await contactRepository.updateLifecycleStage(contactId, workspaceId, nextStage);
  }
}

export const crmService = {
  listLeads,
  createLeadFromConversation,
  updateLeadStage,
  advanceLifecycleStage,
};
