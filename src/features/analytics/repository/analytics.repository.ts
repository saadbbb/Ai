import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
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
  tasks,
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

export interface ProductRevenue {
  productName: string;
  revenue: number;
  quantity: number;
}

export interface AgentCount {
  userId: string;
  count: number;
}

export interface AgentResponseTime {
  userId: string;
  avgSeconds: number;
  replyCount: number;
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

  /** Top products by revenue (delivered/completed orders only) in the range — drives the "revenue by product" report. */
  async revenueByProduct(workspaceId: string, from: Date, to: Date, limit = 10): Promise<ProductRevenue[]> {
    const revenue = sql<number>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`;
    const rows = await db
      .select({ productName: orderItems.name, revenue, quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)` })
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
      .groupBy(orderItems.name)
      .orderBy(desc(revenue))
      .limit(limit);
    return rows.map((row) => ({ productName: row.productName, revenue: Number(row.revenue), quantity: Number(row.quantity) }));
  },

  /** Conversations assigned to each team member and created within the range — feeds the Team Performance report. */
  async conversationsByAgent(workspaceId: string, from: Date, to: Date): Promise<AgentCount[]> {
    const rows = await db
      .select({ userId: conversations.assignedUserId, count: sql<number>`count(*)` })
      .from(conversations)
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          isNotNull(conversations.assignedUserId),
          gte(conversations.createdAt, from),
          lte(conversations.createdAt, to),
        ),
      )
      .groupBy(conversations.assignedUserId);
    return rows.map((row) => ({ userId: row.userId as string, count: Number(row.count) }));
  },

  /** Tasks each team member completed (marked done) in the range — the schema has no completedAt, so updatedAt is the best available proxy. */
  async tasksCompletedByAgent(workspaceId: string, from: Date, to: Date): Promise<AgentCount[]> {
    const rows = await db
      .select({ userId: tasks.assignedToUserId, count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.status, "done"),
          isNotNull(tasks.assignedToUserId),
          gte(tasks.updatedAt, from),
          lte(tasks.updatedAt, to),
        ),
      )
      .groupBy(tasks.assignedToUserId);
    return rows.map((row) => ({ userId: row.userId as string, count: Number(row.count) }));
  },

  /**
   * Per-agent average time-to-first-reply: for each conversation started in the
   * range, finds the first customer message and the first "agent" message (by a
   * real team member, not the AI) that came after it, then averages the gap in
   * seconds per replying agent. Expressed as raw SQL (a window/DISTINCT ON query)
   * because attributing "whose reply was first" isn't expressible as a plain
   * GROUP BY aggregate.
   */
  async avgFirstResponseSecondsByAgent(workspaceId: string, from: Date, to: Date): Promise<AgentResponseTime[]> {
    const result = await db.execute<{ user_id: string; avg_seconds: string; reply_count: string }>(sql`
      with first_customer as (
        select m.conversation_id as conversation_id, min(m.created_at) as customer_at
        from messages m
        inner join conversations c on c.id = m.conversation_id
        where m.workspace_id = ${workspaceId} and m.sender_type = 'customer'
          and c.created_at >= ${from} and c.created_at <= ${to}
        group by m.conversation_id
      ),
      first_agent_reply as (
        select distinct on (m.conversation_id) m.conversation_id as conversation_id, m.sender_user_id, m.created_at as agent_at
        from messages m
        inner join first_customer fc on fc.conversation_id = m.conversation_id
        where m.workspace_id = ${workspaceId} and m.sender_type = 'agent' and m.sender_user_id is not null
          and m.created_at > fc.customer_at
        order by m.conversation_id, m.created_at asc
      )
      select far.sender_user_id as user_id,
             avg(extract(epoch from (far.agent_at - fc.customer_at))) as avg_seconds,
             count(*) as reply_count
      from first_agent_reply far
      inner join first_customer fc on fc.conversation_id = far.conversation_id
      group by far.sender_user_id
    `);
    return result.rows.map((row) => ({
      userId: row.user_id,
      avgSeconds: Number(row.avg_seconds),
      replyCount: Number(row.reply_count),
    }));
  },
};
