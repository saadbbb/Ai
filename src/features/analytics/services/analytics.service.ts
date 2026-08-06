import "server-only";
import {
  appointmentStatusEnum,
  channelTypeEnum,
  orderStatusEnum,
  type AppointmentStatus,
  type ChannelType,
  type OrderStatus,
} from "@/db/schema";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { analyticsRepository, type DayBucket, type ProductRevenue } from "../repository/analytics.repository";
import type { AnalyticsRange } from "../lib/date-range";

const COMPLETED_ORDER_STATUSES: OrderStatus[] = ["delivered", "completed"];
const NON_DRAFT_ORDER_STATUSES: OrderStatus[] = orderStatusEnum.enumValues.filter((status) => status !== "draft");
const CLOSED_APPOINTMENT_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show"];
const CLOSED_LEAD_STAGES = ["won", "lost", "cancelled"] as const;

export type HealthScoreLevel = "excellent" | "good" | "needs_attention" | "critical";

export interface HealthScoreBreakdownItem {
  key: "leadConversion" | "orderCompletion" | "appointmentCompletion" | "aiSuccess";
  rate: number | null;
}

export interface HealthScore {
  score: number | null;
  level: HealthScoreLevel | null;
  breakdown: HealthScoreBreakdownItem[];
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  kpis: {
    newLeads: number;
    revenueTotal: number;
    ordersCompleted: number;
    appointmentsCompleted: number;
    aiRequests: number;
    aiSuccessRate: number | null;
  };
  leadsByDay: DayBucket[];
  revenueByDay: DayBucket[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  appointmentsByStatus: { status: AppointmentStatus; count: number }[];
  conversationsByChannel: { status: ChannelType; count: number }[];
  revenueByProduct: ProductRevenue[];
  healthScore: HealthScore;
}

export interface TeamPerformanceRow {
  userId: string;
  email: string;
  conversationsHandled: number;
  tasksCompleted: number;
  avgResponseMinutes: number | null;
}

function fillDayGaps(days: string[], values: DayBucket[]): DayBucket[] {
  const byDay = new Map(values.map((row) => [row.day, row.value]));
  return days.map((day) => ({ day, value: byDay.get(day) ?? 0 }));
}

function levelFor(score: number): HealthScoreLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "needs_attention";
  return "critical";
}

/**
 * Averages whatever sub-scores have enough data to be meaningful (denominator
 * > 0) and returns null — not zero — when nothing is measurable yet. A brand
 * new workspace with no orders/leads/appointments/AI activity in range should
 * see "not enough data" rather than a fabricated "critical" score.
 */
function computeHealthScore(
  leadConversion: number | null,
  orderCompletion: number | null,
  appointmentCompletion: number | null,
  aiSuccess: number | null,
): HealthScore {
  const breakdown: HealthScoreBreakdownItem[] = [
    { key: "leadConversion", rate: leadConversion },
    { key: "orderCompletion", rate: orderCompletion },
    { key: "appointmentCompletion", rate: appointmentCompletion },
    { key: "aiSuccess", rate: aiSuccess },
  ];

  const available = breakdown.map((item) => item.rate).filter((rate): rate is number => rate !== null);
  if (available.length === 0) {
    return { score: null, level: null, breakdown };
  }

  const score = Math.round((available.reduce((sum, rate) => sum + rate, 0) / available.length) * 100);
  return { score, level: levelFor(score), breakdown };
}

async function getSummary(workspaceId: string, range: AnalyticsRange): Promise<AnalyticsSummary> {
  const { from, to } = range;
  const [
    leadsByDayRaw,
    revenueByDayRaw,
    ordersByStatusRaw,
    appointmentsByStatusRaw,
    leadsByStage,
    channelRows,
    aiUsage,
    revenueByProduct,
  ] = await Promise.all([
    analyticsRepository.leadsCreatedByDay(workspaceId, from, to),
    analyticsRepository.revenueByDay(workspaceId, from, to),
    analyticsRepository.ordersByStatus(workspaceId, from, to),
    analyticsRepository.appointmentsByStatus(workspaceId, from, to),
    analyticsRepository.leadsByStage(workspaceId, from, to),
    analyticsRepository.conversationsByChannel(workspaceId, from, to),
    analyticsRepository.aiUsageInRange(workspaceId, from, to),
    analyticsRepository.revenueByProduct(workspaceId, from, to),
  ]);

  const ordersByStatus = orderStatusEnum.enumValues.map((status) => ({
    status,
    count: ordersByStatusRaw.find((row) => row.status === status)?.count ?? 0,
  }));
  const appointmentsByStatus = appointmentStatusEnum.enumValues.map((status) => ({
    status,
    count: appointmentsByStatusRaw.find((row) => row.status === status)?.count ?? 0,
  }));
  const conversationsByChannel = channelTypeEnum.enumValues.map((type) => ({
    status: type,
    count: channelRows.find((row) => row.status === type)?.count ?? 0,
  }));

  const ordersCompleted = ordersByStatus
    .filter((row) => COMPLETED_ORDER_STATUSES.includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const nonDraftOrders = ordersByStatus
    .filter((row) => NON_DRAFT_ORDER_STATUSES.includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const orderCompletion = nonDraftOrders === 0 ? null : ordersCompleted / nonDraftOrders;

  const appointmentsCompleted = appointmentsByStatus.find((row) => row.status === "completed")?.count ?? 0;
  const closedAppointments = appointmentsByStatus
    .filter((row) => CLOSED_APPOINTMENT_STATUSES.includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const appointmentCompletion = closedAppointments === 0 ? null : appointmentsCompleted / closedAppointments;

  const wonLeads = leadsByStage.find((row) => row.status === "won")?.count ?? 0;
  const closedLeads = leadsByStage
    .filter((row) => (CLOSED_LEAD_STAGES as readonly string[]).includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const leadConversion = closedLeads === 0 ? null : wonLeads / closedLeads;

  const aiSuccessRate = aiUsage.totalRequests === 0 ? null : aiUsage.successCount / aiUsage.totalRequests;

  const revenueTotal = revenueByDayRaw.reduce((sum, row) => sum + row.value, 0);
  const newLeads = leadsByDayRaw.reduce((sum, row) => sum + row.value, 0);

  return {
    range,
    kpis: {
      newLeads,
      revenueTotal,
      ordersCompleted,
      appointmentsCompleted,
      aiRequests: aiUsage.totalRequests,
      aiSuccessRate,
    },
    leadsByDay: fillDayGaps(range.days, leadsByDayRaw),
    revenueByDay: fillDayGaps(range.days, revenueByDayRaw),
    ordersByStatus,
    appointmentsByStatus,
    conversationsByChannel,
    revenueByProduct,
    healthScore: computeHealthScore(leadConversion, orderCompletion, appointmentCompletion, aiSuccessRate),
  };
}

/**
 * One row per current workspace member (not just members with activity) so the
 * report reads as a full team roster — a member with zero conversations/tasks
 * in range still shows up with zeros rather than silently disappearing.
 */
async function getTeamPerformance(workspaceId: string, range: AnalyticsRange): Promise<TeamPerformanceRow[]> {
  const { from, to } = range;
  const [members, conversationCounts, taskCounts, responseTimes] = await Promise.all([
    membershipRepository.findMembersByWorkspaceId(workspaceId),
    analyticsRepository.conversationsByAgent(workspaceId, from, to),
    analyticsRepository.tasksCompletedByAgent(workspaceId, from, to),
    analyticsRepository.avgFirstResponseSecondsByAgent(workspaceId, from, to),
  ]);

  const conversationsByUser = new Map(conversationCounts.map((row) => [row.userId, row.count]));
  const tasksByUser = new Map(taskCounts.map((row) => [row.userId, row.count]));
  const responseByUser = new Map(responseTimes.map((row) => [row.userId, row.avgSeconds]));

  return members
    .map(({ user }) => ({
      userId: user.id,
      email: user.email,
      conversationsHandled: conversationsByUser.get(user.id) ?? 0,
      tasksCompleted: tasksByUser.get(user.id) ?? 0,
      avgResponseMinutes: responseByUser.has(user.id) ? Math.round((responseByUser.get(user.id) ?? 0) / 60) : null,
    }))
    .sort((a, b) => b.conversationsHandled - a.conversationsHandled);
}

export const analyticsService = {
  getSummary,
  getTeamPerformance,
};
