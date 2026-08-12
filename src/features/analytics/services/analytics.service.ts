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
import {
  analyticsRepository,
  type ChannelRevenue,
  type ChannelStat,
  type DayBucket,
  type ProductRevenue,
  type ServiceCount,
} from "../repository/analytics.repository";
import type { AnalyticsRange } from "../lib/date-range";

const COMPLETED_ORDER_STATUSES: OrderStatus[] = ["delivered", "completed"];
const NON_DRAFT_ORDER_STATUSES: OrderStatus[] = orderStatusEnum.enumValues.filter((status) => status !== "draft");
const CLOSED_APPOINTMENT_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show"];
const CLOSED_LEAD_STAGES = ["won", "lost", "cancelled"] as const;

// A first-reply average at/under this many seconds earns full health-score
// credit; at/over this many earns none, with a linear scale in between.
// These are deliberately generous defaults (5 min / 60 min) — the goal is to
// separate "clearly fine" from "clearly a problem," not to enforce an SLA.
const RESPONSE_TIME_FAST_SECONDS = 5 * 60;
const RESPONSE_TIME_SLOW_SECONDS = 60 * 60;

export type HealthScoreLevel = "excellent" | "good" | "needs_attention" | "critical";

export type HealthScoreKey =
  | "leadConversion"
  | "orderCompletion"
  | "appointmentCompletion"
  | "aiSuccess"
  | "responseTime"
  | "missedConversations"
  | "automationSuccess"
  | "revenueTrend";

export interface HealthScoreBreakdownItem {
  key: HealthScoreKey;
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
  leads: {
    byChannel: ChannelStat[];
    won: number;
    lost: number;
    winRate: number | null;
  };
  conversations: {
    byDay: DayBucket[];
    avgResponseSecondsAi: number | null;
    avgResponseSecondsHuman: number | null;
  };
  sales: {
    avgOrderValue: number | null;
    growthPercent: number | null;
    repeatCustomerRate: number | null;
  };
  appointments: {
    byDay: DayBucket[];
    avgLeadTimeHours: number | null;
    topServices: ServiceCount[];
  };
  ai: {
    handoffRate: number | null;
  };
  channels: {
    revenue: ChannelRevenue[];
  };
  customers: {
    newCount: number;
    returningCount: number;
  };
}

export interface TeamPerformanceRow {
  userId: string;
  name: string | null;
  email: string | null;
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

/** Linear ramp: at/under FAST is full credit, at/over SLOW is none. */
function responseTimeRate(avgSeconds: number | null): number | null {
  if (avgSeconds === null) return null;
  if (avgSeconds <= RESPONSE_TIME_FAST_SECONDS) return 1;
  if (avgSeconds >= RESPONSE_TIME_SLOW_SECONDS) return 0;
  return 1 - (avgSeconds - RESPONSE_TIME_FAST_SECONDS) / (RESPONSE_TIME_SLOW_SECONDS - RESPONSE_TIME_FAST_SECONDS);
}

/**
 * Rewards "at least as much revenue as the prior equal-length period" with
 * full credit, and scales down proportionally below that — growth beyond
 * 100% doesn't earn extra credit since this is one input among several, not
 * a standalone growth metric (see sales.growthPercent for the uncapped figure).
 * No prior-period revenue at all means there's nothing to compare against,
 * except the trivial case of "we now have some revenue where there was none."
 */
function revenueTrendRate(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 1 : null;
  return Math.max(0, Math.min(1, current / previous));
}

/**
 * Averages whatever sub-scores have enough data to be meaningful (denominator
 * > 0) and returns null — not zero — when nothing is measurable yet. A brand
 * new workspace with no orders/leads/appointments/AI activity in range should
 * see "not enough data" rather than a fabricated "critical" score.
 */
function computeHealthScore(rates: Record<HealthScoreKey, number | null>): HealthScore {
  const breakdown: HealthScoreBreakdownItem[] = (Object.entries(rates) as [HealthScoreKey, number | null][]).map(
    ([key, rate]) => ({ key, rate }),
  );

  const available = breakdown.map((item) => item.rate).filter((rate): rate is number => rate !== null);
  if (available.length === 0) {
    return { score: null, level: null, breakdown };
  }

  const score = Math.round((available.reduce((sum, rate) => sum + rate, 0) / available.length) * 100);
  return { score, level: levelFor(score), breakdown };
}

async function getSummary(workspaceId: string, range: AnalyticsRange): Promise<AnalyticsSummary> {
  const { from, to } = range;
  const previousPeriodMs = to.getTime() - from.getTime();
  const previousFrom = new Date(from.getTime() - previousPeriodMs);
  const previousTo = from;

  const [
    leadsByDayRaw,
    revenueByDayRaw,
    ordersByStatusRaw,
    appointmentsByStatusRaw,
    leadsByStage,
    channelRows,
    aiUsage,
    revenueByProduct,
    previousRevenueByDay,
    leadsByChannel,
    responseSecondsBySenderType,
    handoverStats,
    automationStats,
    messagesByDay,
    salesRepeatStats,
    appointmentsByDay,
    avgAppointmentLeadTimeSeconds,
    topServicesByAppointments,
    revenueByChannel,
    customerStats,
  ] = await Promise.all([
    analyticsRepository.leadsCreatedByDay(workspaceId, from, to),
    analyticsRepository.revenueByDay(workspaceId, from, to),
    analyticsRepository.ordersByStatus(workspaceId, from, to),
    analyticsRepository.appointmentsByStatus(workspaceId, from, to),
    analyticsRepository.leadsByStage(workspaceId, from, to),
    analyticsRepository.conversationsByChannel(workspaceId, from, to),
    analyticsRepository.aiUsageInRange(workspaceId, from, to),
    analyticsRepository.revenueByProduct(workspaceId, from, to),
    analyticsRepository.revenueByDay(workspaceId, previousFrom, previousTo),
    analyticsRepository.leadsByChannel(workspaceId, from, to),
    analyticsRepository.avgFirstResponseSecondsBySenderType(workspaceId, from, to),
    analyticsRepository.conversationHandoverStats(workspaceId, from, to),
    analyticsRepository.automationStats(workspaceId, from, to),
    analyticsRepository.messagesCreatedByDay(workspaceId, from, to),
    analyticsRepository.repeatCustomerStats(workspaceId, from, to),
    analyticsRepository.appointmentsByDay(workspaceId, from, to),
    analyticsRepository.avgAppointmentLeadTimeSeconds(workspaceId, from, to),
    analyticsRepository.topServicesByAppointmentCount(workspaceId, from, to),
    analyticsRepository.revenueByChannel(workspaceId, from, to),
    analyticsRepository.newVsReturningCustomers(workspaceId, from, to),
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
  const lostLeads = leadsByStage.find((row) => row.status === "lost")?.count ?? 0;
  const closedLeads = leadsByStage
    .filter((row) => (CLOSED_LEAD_STAGES as readonly string[]).includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const leadConversion = closedLeads === 0 ? null : wonLeads / closedLeads;
  const winRate = wonLeads + lostLeads === 0 ? null : wonLeads / (wonLeads + lostLeads);

  const aiSuccessRate = aiUsage.totalRequests === 0 ? null : aiUsage.successCount / aiUsage.totalRequests;

  const revenueTotal = revenueByDayRaw.reduce((sum, row) => sum + row.value, 0);
  const previousRevenueTotal = previousRevenueByDay.reduce((sum, row) => sum + row.value, 0);
  const newLeads = leadsByDayRaw.reduce((sum, row) => sum + row.value, 0);

  const totalReplies = responseSecondsBySenderType.reduce((sum, row) => sum + row.replyCount, 0);
  const overallAvgResponseSeconds =
    totalReplies === 0
      ? null
      : responseSecondsBySenderType.reduce((sum, row) => sum + row.avgSeconds * row.replyCount, 0) / totalReplies;
  const avgResponseSecondsAi = responseSecondsBySenderType.find((row) => row.senderType === "ai")?.avgSeconds ?? null;
  const avgResponseSecondsHuman = responseSecondsBySenderType.find((row) => row.senderType === "agent")?.avgSeconds ?? null;

  const missedConversationRate = handoverStats.total === 0 ? null : handoverStats.handedOver / handoverStats.total;
  const automationSuccessRate = automationStats.total === 0 ? null : automationStats.successCount / automationStats.total;

  const salesGrowthPercent =
    previousRevenueTotal === 0 ? null : ((revenueTotal - previousRevenueTotal) / previousRevenueTotal) * 100;
  const repeatCustomerRate =
    salesRepeatStats.totalCustomers === 0 ? null : salesRepeatStats.repeatCustomers / salesRepeatStats.totalCustomers;

  const healthScore = computeHealthScore({
    leadConversion,
    orderCompletion,
    appointmentCompletion,
    aiSuccess: aiSuccessRate,
    responseTime: responseTimeRate(overallAvgResponseSeconds),
    missedConversations: missedConversationRate === null ? null : 1 - missedConversationRate,
    automationSuccess: automationSuccessRate,
    revenueTrend: revenueTrendRate(revenueTotal, previousRevenueTotal),
  });

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
    healthScore,
    leads: { byChannel: leadsByChannel, won: wonLeads, lost: lostLeads, winRate },
    conversations: {
      byDay: fillDayGaps(range.days, messagesByDay),
      avgResponseSecondsAi,
      avgResponseSecondsHuman,
    },
    sales: {
      avgOrderValue: ordersCompleted === 0 ? null : revenueTotal / ordersCompleted,
      growthPercent: salesGrowthPercent,
      repeatCustomerRate,
    },
    appointments: {
      byDay: fillDayGaps(range.days, appointmentsByDay),
      avgLeadTimeHours: avgAppointmentLeadTimeSeconds === null ? null : avgAppointmentLeadTimeSeconds / 3600,
      topServices: topServicesByAppointments,
    },
    ai: { handoffRate: missedConversationRate },
    channels: { revenue: revenueByChannel },
    customers: { newCount: customerStats.newCustomers, returningCount: customerStats.returningCustomers },
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
      name: user.name,
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
