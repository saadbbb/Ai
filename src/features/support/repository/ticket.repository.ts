import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type NewSupportTicket,
  type NewSupportTicketMessage,
  type SupportTicket,
  type SupportTicketMessage,
  type SupportTicketStatus,
  supportTicketMessages,
  supportTickets,
} from "@/db/schema";

export const ticketRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).where(eq(supportTickets.workspaceId, workspaceId)).orderBy(desc(supportTickets.createdAt));
  },

  async findById(id: string, workspaceId: string): Promise<SupportTicket | null> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.id, id), eq(supportTickets.workspaceId, workspaceId)))
      .limit(1);
    return ticket ?? null;
  },

  async create(data: NewSupportTicket): Promise<SupportTicket> {
    const [ticket] = await db.insert(supportTickets).values(data).returning();
    return ticket;
  },

  async updateStatus(id: string, workspaceId: string, status: SupportTicketStatus): Promise<SupportTicket | null> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(supportTickets.id, id), eq(supportTickets.workspaceId, workspaceId)))
      .returning();
    return ticket ?? null;
  },

  /** Never returns an internal (admin-only) note — see supportTicketMessages.isInternal's schema comment. */
  async findMessagesByTicketId(ticketId: string, workspaceId: string): Promise<SupportTicketMessage[]> {
    return db
      .select()
      .from(supportTicketMessages)
      .where(
        and(
          eq(supportTicketMessages.ticketId, ticketId),
          eq(supportTicketMessages.workspaceId, workspaceId),
          eq(supportTicketMessages.isInternal, false),
        ),
      )
      .orderBy(asc(supportTicketMessages.createdAt));
  },

  async createMessage(data: NewSupportTicketMessage): Promise<SupportTicketMessage> {
    const [message] = await db.insert(supportTicketMessages).values(data).returning();
    return message;
  },
};
