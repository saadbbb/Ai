import "server-only";
import { leadStageEnum, type LeadStage } from "@/db/schema";
import { aiUsageRepository } from "@/features/ai/repository/ai-usage.repository";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { leadTemperature } from "@/features/crm/lib/lead-score";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { taskRepository } from "@/features/crm/repository/task.repository";
import { crmService } from "@/features/crm/services/crm.service";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { orderTotal } from "@/features/orders/lib/order-total";
import { orderRepository } from "@/features/orders/repository/order.repository";

const CLOSED_LEAD_STAGES: LeadStage[] = ["won", "lost", "cancelled"];
const REVENUE_ORDER_STATUSES = ["delivered", "completed"];
const ACTIVE_ORDER_STATUSES = ["draft", "pending", "confirmed", "preparing", "ready"];
/** A lead's contact hasn't been touched in this many days — see PART 5's Follow-up Engine example. */
const COLD_LEAD_THRESHOLD_DAYS = 7;
const ATTENTION_ITEM_LIMIT = 5;

export type ActivityItem =
  | { type: "conversation"; id: string; label: string; timestamp: Date; href: string }
  | { type: "lead"; id: string; label: string; timestamp: Date; href: string }
  | { type: "order"; id: string; label: string; timestamp: Date; href: string };

export interface DashboardSummary {
  conversationsToday: number;
  newLeadsToday: number;
  activePipelineCount: number;
  activeOrdersCount: number;
  revenueTotal: number;
  aiActiveCount: number;
  needsHumanCount: number;
  aiRequestsToday: number;
  totalContacts: number;
  pipelineByStage: { stage: LeadStage; count: number }[];
  recentActivity: ActivityItem[];
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

/**
 * Computed in-process from the same repositories the Inbox/Leads/Orders pages
 * already use — fine at this scale (one workspace's rows). Move to SQL
 * aggregation only once a workspace's row counts make that measurably slow;
 * see Part 7 of the spec for the "never run expensive queries on every page
 * load" rule this deliberately isn't violating yet.
 */
async function getSummary(workspaceId: string): Promise<DashboardSummary> {
  const [conversations, leads, orders, contacts, aiRequestsToday] = await Promise.all([
    conversationRepository.findByWorkspaceId(workspaceId),
    leadRepository.findByWorkspaceId(workspaceId),
    orderRepository.findByWorkspaceId(workspaceId),
    contactRepository.findByWorkspaceId(workspaceId),
    aiUsageRepository.countTodayByWorkspace(workspaceId),
  ]);

  const pipelineByStage = leadStageEnum.enumValues.map((stage) => ({
    stage,
    count: leads.filter((item) => item.lead.stage === stage).length,
  }));

  const recentActivity: ActivityItem[] = [
    ...conversations.slice(0, 8).map(
      ({ conversation, contact }): ActivityItem => ({
        type: "conversation",
        id: conversation.id,
        label: contact.fullName,
        timestamp: conversation.createdAt,
        href: `/dashboard/inbox/${conversation.id}`,
      }),
    ),
    ...leads.slice(0, 8).map(
      ({ lead, contact }): ActivityItem => ({
        type: "lead",
        id: lead.id,
        label: contact.fullName,
        timestamp: lead.createdAt,
        href: "/dashboard/leads",
      }),
    ),
    ...orders.slice(0, 8).map(
      ({ order, contact, items }): ActivityItem => ({
        type: "order",
        id: order.id,
        label: `${contact.fullName} — ${orderTotal(items).toFixed(2)}`,
        timestamp: order.createdAt,
        href: `/dashboard/orders/${order.id}`,
      }),
    ),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  return {
    conversationsToday: conversations.filter((item) => isToday(item.conversation.createdAt)).length,
    newLeadsToday: leads.filter((item) => isToday(item.lead.createdAt)).length,
    activePipelineCount: leads.filter((item) => !CLOSED_LEAD_STAGES.includes(item.lead.stage)).length,
    activeOrdersCount: orders.filter((item) => ACTIVE_ORDER_STATUSES.includes(item.order.status)).length,
    revenueTotal: orders
      .filter((item) => REVENUE_ORDER_STATUSES.includes(item.order.status))
      .reduce((sum, item) => sum + orderTotal(item.items), 0),
    aiActiveCount: conversations.filter((item) => item.conversation.aiStatus === "active").length,
    needsHumanCount: conversations.filter((item) => item.conversation.aiStatus === "handed_over").length,
    aiRequestsToday,
    totalContacts: contacts.length,
    pipelineByStage,
    recentActivity,
  };
}

/** PART 13B Band 1 — "what happened today," glanceable counters only. */
export interface TodayBand {
  conversationsToday: number;
  newLeadsToday: number;
  ordersToday: number;
  appointmentsToday: number;
  revenueToday: number;
}

/** PART 13B Band 2 — "what needs my attention," AI/rule-curated, capped and linkable. */
export type AttentionItemType = "handover" | "cold_lead" | "hot_lead";

export interface AttentionItem {
  type: AttentionItemType;
  id: string;
  label: string;
  href: string;
}

export interface AttentionBand {
  items: AttentionItem[];
}

function daysSince(date: Date | null): number {
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Bands 1 and 2 share the same authorization requirement (base workspace
 * membership, already verified by the caller) and mostly the same source
 * rows, so they're fetched together — unlike the Growth band (see the
 * analytics page/service), which needs its own extra `analytics.view`
 * permission check and is deliberately kept as a separate call so that
 * check isn't inherited from this one.
 */
async function getTodayAndAttentionBands(
  workspaceId: string,
): Promise<{ today: TodayBand; attention: AttentionBand; pipelineByStage: { stage: LeadStage; count: number }[] }> {
  const [conversations, leads, orders, appointments, scoredLeads] = await Promise.all([
    conversationRepository.findByWorkspaceId(workspaceId),
    leadRepository.findByWorkspaceId(workspaceId),
    orderRepository.findByWorkspaceId(workspaceId),
    appointmentRepository.findByWorkspaceId(workspaceId),
    crmService.listLeads(workspaceId),
  ]);

  const today: TodayBand = {
    conversationsToday: conversations.filter((item) => isToday(item.conversation.createdAt)).length,
    newLeadsToday: leads.filter((item) => isToday(item.lead.createdAt)).length,
    ordersToday: orders.filter((item) => isToday(item.order.createdAt)).length,
    appointmentsToday: appointments.filter((item) => isToday(item.appointment.scheduledAt)).length,
    revenueToday: orders
      .filter((item) => REVENUE_ORDER_STATUSES.includes(item.order.status) && isToday(item.order.createdAt))
      .reduce((sum, item) => sum + orderTotal(item.items), 0),
  };

  const handoverItems: AttentionItem[] = conversations
    .filter((item) => item.conversation.aiStatus === "handed_over")
    .slice(0, ATTENTION_ITEM_LIMIT)
    .map((item) => ({
      type: "handover",
      id: item.conversation.id,
      label: item.contact.fullName,
      href: `/dashboard/inbox/${item.conversation.id}`,
    }));

  const coldLeadItems: AttentionItem[] = leads
    .filter(
      (item) => !CLOSED_LEAD_STAGES.includes(item.lead.stage) && daysSince(item.contact.lastContactAt) >= COLD_LEAD_THRESHOLD_DAYS,
    )
    .slice(0, ATTENTION_ITEM_LIMIT)
    .map((item) => ({
      type: "cold_lead",
      id: item.lead.id,
      label: item.contact.fullName,
      href: `/dashboard/contacts/${item.contact.id}`,
    }));

  // "AI Recommendations" (PART 7 gap: "contact these 5 hot leads today") — reuses the same
  // deterministic score crmService.listLeads/lead-score.ts already compute and the Leads
  // board already displays, rather than a separate recommendation model.
  const hotLeadItems: AttentionItem[] = scoredLeads
    .filter((item) => !CLOSED_LEAD_STAGES.includes(item.lead.stage))
    .filter((item) => {
      const temperature = leadTemperature(item.score);
      return temperature === "hot" || temperature === "priority";
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, ATTENTION_ITEM_LIMIT)
    .map((item) => ({
      type: "hot_lead",
      id: item.lead.id,
      label: item.contact.fullName,
      href: `/dashboard/contacts/${item.contact.id}`,
    }));

  const pipelineByStage = leadStageEnum.enumValues.map((stage) => ({
    stage,
    count: leads.filter((item) => item.lead.stage === stage).length,
  }));

  return { today, attention: { items: [...handoverItems, ...coldLeadItems, ...hotLeadItems] }, pipelineByStage };
}

/**
 * PART 7's Agent Dashboard ("Assigned Conversations, Assigned Tasks, Today's
 * Appointments...") vs. the Owner Dashboard's workspace-wide revenue/pipeline
 * view — this is the piece of "no role-based dashboards" (PART 7 gap) that's
 * addressed here; the Growth band was already role-gated (analytics.view)
 * before this. Appointments stay workspace-wide since there's no per-agent
 * appointment assignment field in the schema yet — a real, smaller, separately
 * flagged gap, not silently worked around here.
 */
export interface MyWorkItem {
  id: string;
  label: string;
  href: string;
}

export interface MyWorkBand {
  assignedConversationsCount: number;
  assignedOpenTasksCount: number;
  appointmentsToday: number;
  assignedConversations: MyWorkItem[];
}

async function getMyWorkBand(workspaceId: string, userId: string): Promise<MyWorkBand> {
  const [assignedConversations, assignedTasks, appointments] = await Promise.all([
    conversationRepository.findOpenByAssignedUser(workspaceId, userId),
    taskRepository.findOpenByAssignedUser(workspaceId, userId),
    appointmentRepository.findByWorkspaceId(workspaceId),
  ]);

  return {
    assignedConversationsCount: assignedConversations.length,
    assignedOpenTasksCount: assignedTasks.length,
    appointmentsToday: appointments.filter((item) => isToday(item.appointment.scheduledAt)).length,
    assignedConversations: assignedConversations.slice(0, ATTENTION_ITEM_LIMIT).map((item) => ({
      id: item.conversation.id,
      label: item.contact.fullName,
      href: `/dashboard/inbox/${item.conversation.id}`,
    })),
  };
}

export const dashboardService = {
  getSummary,
  getTodayAndAttentionBands,
  getMyWorkBand,
};
