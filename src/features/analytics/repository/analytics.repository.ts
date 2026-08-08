import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  aiUsage,
  appointments,
  type AppointmentStatus,
  channels,
  type ChannelType,
  contacts,
  conversations,
  leads,
  type LeadStage,
  messages,
  orderItems,
  orders,
  type OrderStatus,
  tasks,
  workflowExecutions,
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

export interface SenderTypeResponseTime {
  senderType: "ai" | "agent";
  avgSeconds: number;
  replyCount: number;
}

export interface ChannelStat {
  channelType: ChannelType | null;
  count: number;
}

export interface ChannelRevenue {
  channelType: ChannelType | null;
  revenue: number;
}

export interface ServiceCount {
  serviceName: string;
  count: number;
}

export interface RepeatCustomerStats {
  totalCustomers: number;
  repeatCustomers: number;
}

export interface NewVsReturningCustomers {
  newCustomers: number;
  returningCustomers: number;
}

export interface HandoverStats {
  total: number;
  handedOver: number;
}

export interface AutomationStats {
  total: number;
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

  /** Same shape as avgFirstResponseSecondsByAgent, but bucketed by whether the AI or a human agent replied first — not by which specific agent. */
  async avgFirstResponseSecondsBySenderType(workspaceId: string, from: Date, to: Date): Promise<SenderTypeResponseTime[]> {
    const result = await db.execute<{ sender_type: "ai" | "agent"; avg_seconds: string; reply_count: string }>(sql`
      with first_customer as (
        select m.conversation_id as conversation_id, min(m.created_at) as customer_at
        from messages m
        inner join conversations c on c.id = m.conversation_id
        where m.workspace_id = ${workspaceId} and m.sender_type = 'customer'
          and c.created_at >= ${from} and c.created_at <= ${to}
        group by m.conversation_id
      ),
      first_reply as (
        select distinct on (m.conversation_id) m.conversation_id as conversation_id, m.sender_type, m.created_at as reply_at
        from messages m
        inner join first_customer fc on fc.conversation_id = m.conversation_id
        where m.workspace_id = ${workspaceId} and m.sender_type in ('ai', 'agent')
          and m.created_at > fc.customer_at
        order by m.conversation_id, m.created_at asc
      )
      select fr.sender_type as sender_type,
             avg(extract(epoch from (fr.reply_at - fc.customer_at))) as avg_seconds,
             count(*) as reply_count
      from first_reply fr
      inner join first_customer fc on fc.conversation_id = fr.conversation_id
      group by fr.sender_type
    `);
    return result.rows.map((row) => ({
      senderType: row.sender_type,
      avgSeconds: Number(row.avg_seconds),
      replyCount: Number(row.reply_count),
    }));
  },

  /** Messages sent (any sender) per day — feeds the conversation-volume trend chart. */
  async messagesCreatedByDay(workspaceId: string, from: Date, to: Date): Promise<DayBucket[]> {
    const day = sql<string>`to_char(${messages.createdAt} at time zone 'utc', 'YYYY-MM-DD')`;
    const rows = await db
      .select({ day, value: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.workspaceId, workspaceId), gte(messages.createdAt, from), lte(messages.createdAt, to)))
      .groupBy(day);
    return rows.map((row) => ({ day: row.day, value: Number(row.value) }));
  },

  /** Total conversations started in range vs how many ended up handed to a human — feeds both the health score and AI analytics' handoff rate. */
  async conversationHandoverStats(workspaceId: string, from: Date, to: Date): Promise<HandoverStats> {
    const [row] = await db
      .select({
        total: sql<number>`count(*)`,
        handedOver: sql<number>`count(*) filter (where ${conversations.aiStatus} = 'handed_over')`,
      })
      .from(conversations)
      .where(and(eq(conversations.workspaceId, workspaceId), gte(conversations.createdAt, from), lte(conversations.createdAt, to)));
    return { total: Number(row?.total ?? 0), handedOver: Number(row?.handedOver ?? 0) };
  },

  /** Workflow runs triggered in range and how many succeeded — feeds the health score's automation-success input. */
  async automationStats(workspaceId: string, from: Date, to: Date): Promise<AutomationStats> {
    const [row] = await db
      .select({
        total: sql<number>`count(*)`,
        successCount: sql<number>`count(*) filter (where ${workflowExecutions.success} = true)`,
      })
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.workspaceId, workspaceId),
          gte(workflowExecutions.triggeredAt, from),
          lte(workflowExecutions.triggeredAt, to),
        ),
      );
    return { total: Number(row?.total ?? 0), successCount: Number(row?.successCount ?? 0) };
  },

  /** Appointments due to happen each day in range — a calendar-load trend, distinct from when they were booked. */
  async appointmentsByDay(workspaceId: string, from: Date, to: Date): Promise<DayBucket[]> {
    const day = sql<string>`to_char(${appointments.scheduledAt} at time zone 'utc', 'YYYY-MM-DD')`;
    const rows = await db
      .select({ day, value: sql<number>`count(*)` })
      .from(appointments)
      .where(and(eq(appointments.workspaceId, workspaceId), gte(appointments.scheduledAt, from), lte(appointments.scheduledAt, to)))
      .groupBy(day);
    return rows.map((row) => ({ day: row.day, value: Number(row.value) }));
  },

  /** Average gap between booking an appointment and when it's scheduled to happen, for appointments booked in range. */
  async avgAppointmentLeadTimeSeconds(workspaceId: string, from: Date, to: Date): Promise<number | null> {
    const [row] = await db
      .select({ avgSeconds: sql<string | null>`avg(extract(epoch from (${appointments.scheduledAt} - ${appointments.createdAt})))` })
      .from(appointments)
      .where(and(eq(appointments.workspaceId, workspaceId), gte(appointments.createdAt, from), lte(appointments.createdAt, to)));
    return row?.avgSeconds == null ? null : Number(row.avgSeconds);
  },

  /** Most-booked services (by snapshotted name) among appointments scheduled in range. */
  async topServicesByAppointmentCount(workspaceId: string, from: Date, to: Date, limit = 5): Promise<ServiceCount[]> {
    const countExpr = sql<number>`count(*)`;
    const rows = await db
      .select({ serviceName: appointments.serviceName, count: countExpr })
      .from(appointments)
      .where(
        and(
          eq(appointments.workspaceId, workspaceId),
          isNotNull(appointments.serviceName),
          gte(appointments.scheduledAt, from),
          lte(appointments.scheduledAt, to),
        ),
      )
      .groupBy(appointments.serviceName)
      .orderBy(desc(countExpr))
      .limit(limit);
    return rows.map((row) => ({ serviceName: row.serviceName as string, count: Number(row.count) }));
  },

  /** Leads attributed to the channel of the conversation they were raised from — null channelType means the lead wasn't tied to a conversation (a walk-in/manual entry). */
  async leadsByChannel(workspaceId: string, from: Date, to: Date): Promise<ChannelStat[]> {
    const rows = await db
      .select({ channelType: channels.type, count: sql<number>`count(*)` })
      .from(leads)
      .leftJoin(conversations, eq(conversations.id, leads.conversationId))
      .leftJoin(channels, eq(channels.id, conversations.channelId))
      .where(and(eq(leads.workspaceId, workspaceId), gte(leads.createdAt, from), lte(leads.createdAt, to)))
      .groupBy(channels.type);
    return rows.map((row) => ({ channelType: row.channelType, count: Number(row.count) }));
  },

  /** Revenue attributed to the channel of the order's conversation — same null-channel meaning as leadsByChannel. */
  async revenueByChannel(workspaceId: string, from: Date, to: Date): Promise<ChannelRevenue[]> {
    const revenue = sql<number>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`;
    const rows = await db
      .select({ channelType: channels.type, revenue })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .leftJoin(conversations, eq(conversations.id, orders.conversationId))
      .leftJoin(channels, eq(channels.id, conversations.channelId))
      .where(
        and(
          eq(orders.workspaceId, workspaceId),
          inArray(orders.status, ["delivered", "completed"]),
          gte(orders.createdAt, from),
          lte(orders.createdAt, to),
        ),
      )
      .groupBy(channels.type);
    return rows.map((row) => ({ channelType: row.channelType, revenue: Number(row.revenue) }));
  },

  /**
   * "Repeat" here means placed more than one completed order within the
   * range itself, not against all-time history — cheaper to compute and
   * still a meaningful signal for a report window.
   */
  async repeatCustomerStats(workspaceId: string, from: Date, to: Date): Promise<RepeatCustomerStats> {
    const rows = await db
      .select({ contactId: orders.contactId, count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.workspaceId, workspaceId),
          inArray(orders.status, ["delivered", "completed"]),
          gte(orders.createdAt, from),
          lte(orders.createdAt, to),
        ),
      )
      .groupBy(orders.contactId);
    return { totalCustomers: rows.length, repeatCustomers: rows.filter((row) => Number(row.count) > 1).length };
  },

  /** "Returning" = placed a completed order in range but was already a contact before the range started. */
  async newVsReturningCustomers(workspaceId: string, from: Date, to: Date): Promise<NewVsReturningCustomers> {
    const [newRow] = await db
      .select({ value: sql<number>`count(*)` })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), gte(contacts.createdAt, from), lte(contacts.createdAt, to)));

    const returningRows = await db
      .selectDistinct({ contactId: orders.contactId })
      .from(orders)
      .innerJoin(contacts, eq(contacts.id, orders.contactId))
      .where(
        and(
          eq(orders.workspaceId, workspaceId),
          inArray(orders.status, ["delivered", "completed"]),
          gte(orders.createdAt, from),
          lte(orders.createdAt, to),
          sql`${contacts.createdAt} < ${from}`,
        ),
      );

    return { newCustomers: Number(newRow?.value ?? 0), returningCustomers: returningRows.length };
  },
};
