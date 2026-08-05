import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  aiUsage,
  appointments,
  type AppointmentStatus,
  channels,
  type ChannelType,
  conversations,
  leads,
  type LeadStage,
  orderItems,
  orders,
  type OrderStatus,
} from "@/db/schema";

export interface DayBucket {
  day: string;
  value: number;
}

export interface StatusCount<T extends string> {
  status: T;
  count: number;
}

export interface AiUsageRangeSummary {
  totalRequests: number;
  successCount: number;
}

/**
 * Real SQL aggregation (not in-process JS filtering like dashboard.service.ts)
 * — this page is a date-ranged report, not a small live snapshot, so pushing
 * the grouping into Postgres is the right default from the start. Mirrors the
 * style already established in ai-usage-admin.repository.ts.
 */
export const analyticsRepository = {
  async leadsCreatedByDay(workspaceId: string, from: Date, to: Date): Promise<DayBucket[]> {
    const day = sql<string>`to_char(${leads.createdAt} at time zone 'utc', 'YYYY-MM-DD')`;
    const rows = await db
      .select({ day, value: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.workspaceId, workspaceId), gte(leads.createdAt, from), lte(leads.createdAt, to)))
      .groupBy(day);
    return rows.map((row) => ({ day: row.day, value: Number(row.value) }));
  },

  async revenueByDay(workspaceId: string, from: Date, to: Date): Promise<DayBucket[]> {
    const day = sql<string>`to_char(${orders.createdAt} at time zone 'utc', 'YYYY-MM-DD')`;
    const rows = await db
      .select({
        day,
        value: sql<number>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.workspaceId, workspaceId),
          inArray(orders.status, ["delivered", "completed"]),
          gte(orders.createdAt, from),
          lte(orders.createdAt, to),
        ),
      )
      .groupBy(day);
    return rows.map((row) => ({ day: row.day, value: Number(row.value) }));
  },

  async ordersByStatus(workspaceId: string, from: Date, to: Date): Promise<StatusCount<OrderStatus>[]> {
    const rows = await db
      .select({ status: orders.status, count: sql<number>`count(*)` })
      .from(orders)
      .where(and(eq(orders.workspaceId, workspaceId), gte(orders.createdAt, from), lte(orders.createdAt, to)))
      .groupBy(orders.status);
    return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
  },

  async appointmentsByStatus(workspaceId: string, from: Date, to: Date): Promise<StatusCount<AppointmentStatus>[]> {
    const rows = await db
      .select({ status: appointments.status, count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.workspaceId, workspaceId),
          gte(appointments.scheduledAt, from),
          lte(appointments.scheduledAt, to),
        ),
      )
      .groupBy(appointments.status);
    return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
  },

  async leadsByStage(workspaceId: string, from: Date, to: Date): Promise<StatusCount<LeadStage>[]> {
    const rows = await db
      .select({ status: leads.stage, count: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.workspaceId, workspaceId), gte(leads.createdAt, from), lte(leads.createdAt, to)))
      .groupBy(leads.stage);
    return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
  },

  async conversationsByChannel(workspaceId: string, from: Date, to: Date): Promise<StatusCount<ChannelType>[]> {
    const rows = await db
      .select({ status: channels.type, count: sql<number>`count(*)` })
      .from(conversations)
      .innerJoin(channels, eq(channels.id, conversations.channelId))
      .where(
        and(eq(conversations.workspaceId, workspaceId), gte(conversations.createdAt, from), lte(conversations.createdAt, to)),
      )
      .groupBy(channels.type);
    return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
  },

  async aiUsageInRange(workspaceId: string, from: Date, to: Date): Promise<AiUsageRangeSummary> {
    const [row] = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        successCount: sql<number>`count(*) filter (where ${aiUsage.success} = true)`,
      })
      .from(aiUsage)
      .where(and(eq(aiUsage.workspaceId, workspaceId), gte(aiUsage.createdAt, from), lte(aiUsage.createdAt, to)));
    return { totalRequests: Number(row?.totalRequests ?? 0), successCount: Number(row?.successCount ?? 0) };
  },
};
