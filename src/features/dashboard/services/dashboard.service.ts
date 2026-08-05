import "server-only";
import { leadStageEnum, type LeadStage } from "@/db/schema";
import { aiUsageRepository } from "@/features/ai/repository/ai-usage.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { orderTotal } from "@/features/orders/lib/order-total";
import { orderRepository } from "@/features/orders/repository/order.repository";

const CLOSED_LEAD_STAGES: LeadStage[] = ["won", "lost", "cancelled"];
const REVENUE_ORDER_STATUSES = ["delivered", "completed"];
const ACTIVE_ORDER_STATUSES = ["draft", "pending", "confirmed", "preparing", "ready"];

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

export const dashboardService = {
  getSummary,
};
