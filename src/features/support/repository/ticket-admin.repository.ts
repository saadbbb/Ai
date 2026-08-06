import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type NewSupportTicketMessage,
  type SupportTicket,
  type SupportTicketMessage,
  type SupportTicketStatus,
  supportTicketMessages,
  supportTickets,
  workspaces,
} from "@/db/schema";

export interface TicketAdminListItem {
  ticket: SupportTicket;
  workspaceName: string;
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
      .select({ ticket: supportTickets, workspaceName: workspaces.name })
      .from(supportTickets)
      .innerJoin(workspaces, eq(workspaces.id, supportTickets.workspaceId))
      .orderBy(desc(supportTickets.createdAt));
    return rows;
  },

  async findById(id: string): Promise<(TicketAdminListItem & { workspaceId: string }) | null> {
    const [row] = await db
      .select({ ticket: supportTickets, workspaceName: workspaces.name, workspaceId: workspaces.id })
      .from(supportTickets)
      .innerJoin(workspaces, eq(workspaces.id, supportTickets.workspaceId))
      .where(eq(supportTickets.id, id))
      .limit(1);
    return row ?? null;
  },

  async updateStatus(id: string, status: SupportTicketStatus): Promise<SupportTicket | null> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket ?? null;
  },

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
};
