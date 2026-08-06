import "server-only";
import type { SupportTicket, SupportTicketMessage, SupportTicketPriority } from "@/db/schema";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { AppError } from "@/lib/errors/app-error";
import { ticketRepository } from "../repository/ticket.repository";

interface CreateTicketInput {
  subject: string;
  message: string;
  priority: SupportTicketPriority;
}

async function listTickets(workspaceId: string): Promise<SupportTicket[]> {
  return ticketRepository.findByWorkspaceId(workspaceId);
}

async function getTicketWithMessages(
  workspaceId: string,
  ticketId: string,
): Promise<{ ticket: SupportTicket; messages: SupportTicketMessage[] }> {
  const ticket = await ticketRepository.findById(ticketId, workspaceId);
  if (!ticket) throw new AppError("NOT_FOUND", "Support ticket not found.");
  const messages = await ticketRepository.findMessagesByTicketId(ticketId, workspaceId);
  return { ticket, messages };
}

async function createTicket(
  workspaceId: string,
  userId: string,
  userEmail: string,
  input: CreateTicketInput,
): Promise<SupportTicket> {
  const ticket = await ticketRepository.create({
    workspaceId,
    subject: input.subject,
    priority: input.priority,
    createdByUserId: userId,
  });

  await ticketRepository.createMessage({
    ticketId: ticket.id,
    workspaceId,
    authorType: "tenant",
    authorUserId: userId,
    content: input.message,
  });

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: userId,
    actorEmail: userEmail,
    action: "support_ticket_created",
    targetType: "support_ticket",
    targetId: ticket.id,
    summary: `Opened a support ticket: "${ticket.subject}"`,
  });

  return ticket;
}

/** A tenant reply to a resolved/closed ticket reopens it — a quiet ticket only means nobody's touched it, not that the tenant's issue is over. */
async function replyToTicket(
  workspaceId: string,
  userId: string,
  userEmail: string,
  ticketId: string,
  content: string,
): Promise<SupportTicketMessage> {
  const ticket = await ticketRepository.findById(ticketId, workspaceId);
  if (!ticket) throw new AppError("NOT_FOUND", "Support ticket not found.");

  const message = await ticketRepository.createMessage({
    ticketId,
    workspaceId,
    authorType: "tenant",
    authorUserId: userId,
    content,
  });

  if (ticket.status === "resolved" || ticket.status === "closed") {
    await ticketRepository.updateStatus(ticketId, workspaceId, "open");
  }

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: userId,
    actorEmail: userEmail,
    action: "support_ticket_replied",
    targetType: "support_ticket",
    targetId: ticketId,
    summary: `Replied to support ticket: "${ticket.subject}"`,
  });

  return message;
}

export const ticketService = {
  listTickets,
  getTicketWithMessages,
  createTicket,
  replyToTicket,
};
