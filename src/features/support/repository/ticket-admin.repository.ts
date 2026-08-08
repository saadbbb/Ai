import { asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type NewSupportTicketMessage,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketMessage,
  type SupportTicketStatus,
  supportTicketMessages,
  supportTickets,
  users,
  workspaces,
} from "@/db/schema";

export interface TicketStatusCounts {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface TicketAdminListItem {
  ticket: SupportTicket;
  workspaceName: string;
  assignedAdminEmail: string | null;
}

export interface TicketTimingStats {
  /** Average seconds from ticket creation to the first admin reply, across tickets that have one. */
  avgResponseSeconds: number | null;
  /** Average seconds from ticket creation to resolvedAt, across tickets that have been resolved. */
  avgResolutionSeconds: number | null;
}

/**
 * Deliberately separate from the tenant-scoped ticketRepository — mirrors
 * workspaceAdminRepository's split (see that file's own comment): the Super
 * Admin Platform is the one place allowed to see support tickets across
 * every workspace, not just the caller's own. Only ever called from
 * requirePlatformAdmin()-gated actions/pages.
 */
export const ticketAdminRepository = {
  async findAll(): Promise<TicketAdminListItem[]> {
    const rows = await db
      .select({ ticket: supportTickets, workspaceName: workspaces.name, assignedAdminEmail: users.email })
      .from(supportTickets)
      .innerJoin(workspaces, eq(workspaces.id, supportTickets.workspaceId))
      .leftJoin(users, eq(users.id, supportTickets.assignedAdminUserId))
      .orderBy(desc(supportTickets.createdAt));
    return rows.map((row) => ({ ...row, assignedAdminEmail: row.assignedAdminEmail ?? null }));
  },

  async findById(id: string): Promise<(TicketAdminListItem & { workspaceId: string }) | null> {
    const [row] = await db
      .select({
        ticket: supportTickets,
        workspaceName: workspaces.name,
        workspaceId: workspaces.id,
        assignedAdminEmail: users.email,
      })
      .from(supportTickets)
      .innerJoin(workspaces, eq(workspaces.id, supportTickets.workspaceId))
      .leftJoin(users, eq(users.id, supportTickets.assignedAdminUserId))
      .where(eq(supportTickets.id, id))
      .limit(1);
    return row ? { ...row, assignedAdminEmail: row.assignedAdminEmail ?? null } : null;
  },

  /** Sets resolvedAt the first time status becomes "resolved" — moving away from it clears the timestamp, since it's no longer accurate if the ticket is reopened and resolved again later. */
  async updateStatus(id: string, status: SupportTicketStatus): Promise<SupportTicket | null> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ status, resolvedAt: status === "resolved" ? new Date() : null, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket ?? null;
  },

  async assign(id: string, adminUserId: string | null): Promise<SupportTicket | null> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ assignedAdminUserId: adminUserId, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket ?? null;
  },

  async setCategory(id: string, category: SupportTicketCategory): Promise<SupportTicket | null> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ category, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket ?? null;
  },

  /** Includes internal notes — this is the admin-facing view. */
  async findMessagesByTicketId(ticketId: string): Promise<SupportTicketMessage[]> {
    return db
      .select()
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(asc(supportTicketMessages.createdAt));
  },

  async createMessage(data: NewSupportTicketMessage): Promise<SupportTicketMessage> {
    const [message] = await db.insert(supportTicketMessages).values(data).returning();
    return message;
  },

  /** Feeds the Super Admin home dashboard's ticket counter. */
  async countByStatus(): Promise<TicketStatusCounts> {
    const [row] = await db
      .select({
        open: sql<number>`count(*) filter (where ${supportTickets.status} = 'open')`,
        in_progress: sql<number>`count(*) filter (where ${supportTickets.status} = 'in_progress')`,
        resolved: sql<number>`count(*) filter (where ${supportTickets.status} = 'resolved')`,
        closed: sql<number>`count(*) filter (where ${supportTickets.status} = 'closed')`,
      })
      .from(supportTickets);
    return {
      open: Number(row?.open ?? 0),
      in_progress: Number(row?.in_progress ?? 0),
      resolved: Number(row?.resolved ?? 0),
      closed: Number(row?.closed ?? 0),
    };
  },

  /** Feeds the Super Admin tickets page's response/resolution-time stats. */
  async getTimingStats(): Promise<TicketTimingStats> {
    const responseResult = await db.execute<{ avg_seconds: string | null }>(sql`
      with first_admin_reply as (
        select distinct on (m.ticket_id) m.ticket_id, m.created_at as reply_at
        from support_ticket_messages m
        where m.author_type = 'admin'
        order by m.ticket_id, m.created_at asc
      )
      select avg(extract(epoch from (far.reply_at - t.created_at))) as avg_seconds
      from first_admin_reply far
      inner join support_tickets t on t.id = far.ticket_id
    `);
    const responseRow = responseResult.rows[0];

    const [resolutionRow] = await db
      .select({ avgSeconds: sql<string | null>`avg(extract(epoch from (${supportTickets.resolvedAt} - ${supportTickets.createdAt})))` })
      .from(supportTickets)
      .where(isNotNull(supportTickets.resolvedAt));

    return {
      avgResponseSeconds: responseRow?.avg_seconds == null ? null : Number(responseRow.avg_seconds),
      avgResolutionSeconds: resolutionRow?.avgSeconds == null ? null : Number(resolutionRow.avgSeconds),
    };
  },
};
