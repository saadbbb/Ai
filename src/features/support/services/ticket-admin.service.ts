import "server-only";
import type { SupportTicket, SupportTicketCategory, SupportTicketMessage, SupportTicketStatus } from "@/db/schema";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { auditLogRepository } from "@/features/platform-admin/repository/audit-log.repository";
import { emailService } from "@/lib/email";
import { userRepository } from "@/features/auth/repository/user.repository";
import { AppError } from "@/lib/errors/app-error";
import { ticketAdminRepository, type TicketAdminListItem, type TicketTimingStats } from "../repository/ticket-admin.repository";

async function listTickets(): Promise<TicketAdminListItem[]> {
  return ticketAdminRepository.findAll();
}

async function getTicketWithMessages(
  ticketId: string,
): Promise<{ ticket: SupportTicket; workspaceName: string; messages: SupportTicketMessage[] }> {
  const row = await ticketAdminRepository.findById(ticketId);
  if (!row) throw new AppError("NOT_FOUND", "Support ticket not found.");
  const messages = await ticketAdminRepository.findMessagesByTicketId(ticketId);
  return { ticket: row.ticket, workspaceName: row.workspaceName, messages };
}

/**
 * The in-app notification is unconditional (same pattern as automation's
 * notify_owner_email — see that file's comment) since Resend is still
 * sandboxed per DEFERRED_TASKS.md; the email is best-effort on top. Skipped
 * entirely for an internal note — the tenant is never notified of something
 * they're not allowed to see (see supportTicketMessages.isInternal).
 */
async function replyToTicket(
  adminUserId: string,
  adminEmail: string,
  ticketId: string,
  content: string,
  isInternal = false,
): Promise<SupportTicketMessage> {
  const row = await ticketAdminRepository.findById(ticketId);
  if (!row) throw new AppError("NOT_FOUND", "Support ticket not found.");

  const message = await ticketAdminRepository.createMessage({
    ticketId,
    workspaceId: row.workspaceId,
    authorType: "admin",
    authorUserId: adminUserId,
    content,
    isInternal,
  });

  if (isInternal) {
    await auditLogRepository.log({
      actorUserId: adminUserId,
      actorEmail: adminEmail,
      action: "support_ticket_replied",
      targetType: "support_ticket",
      targetId: ticketId,
      summary: `Added an internal note to support ticket "${row.ticket.subject}" (workspace: ${row.workspaceName})`,
    });
    return message;
  }

  if (row.ticket.status === "open") {
    await ticketAdminRepository.updateStatus(ticketId, "in_progress");
  }

  await notificationRepository.create({
    workspaceId: row.workspaceId,
    type: "support_ticket_reply",
    title: `Reply on "${row.ticket.subject}"`,
    message: content.length > 140 ? `${content.slice(0, 140)}…` : content,
    link: `/dashboard/support/${ticketId}`,
  });

  if (row.ticket.createdByUserId) {
    const owner = await userRepository.findById(row.ticket.createdByUserId);
    if (owner?.email) {
      try {
        await emailService.sendNotificationEmail({
          to: owner.email,
          subject: `Reply on your support ticket: "${row.ticket.subject}"`,
          text: content,
        });
      } catch (error) {
        console.error(`[support] ticket ${ticketId} reply email failed:`, error);
      }
    }
  }

  await auditLogRepository.log({
    actorUserId: adminUserId,
    actorEmail: adminEmail,
    action: "support_ticket_replied",
    targetType: "support_ticket",
    targetId: ticketId,
    summary: `Replied to support ticket "${row.ticket.subject}" (workspace: ${row.workspaceName})`,
  });

  return message;
}

async function updateStatus(
  adminUserId: string,
  adminEmail: string,
  ticketId: string,
  status: SupportTicketStatus,
): Promise<SupportTicket> {
  const ticket = await ticketAdminRepository.updateStatus(ticketId, status);
  if (!ticket) throw new AppError("NOT_FOUND", "Support ticket not found.");

  await auditLogRepository.log({
    actorUserId: adminUserId,
    actorEmail: adminEmail,
    action: "support_ticket_status_changed",
    targetType: "support_ticket",
    targetId: ticketId,
    summary: `Changed support ticket "${ticket.subject}" status to "${status}"`,
  });

  return ticket;
}

async function assignTicket(
  adminUserId: string,
  adminEmail: string,
  ticketId: string,
  assignToUserId: string | null,
): Promise<SupportTicket> {
  const ticket = await ticketAdminRepository.assign(ticketId, assignToUserId);
  if (!ticket) throw new AppError("NOT_FOUND", "Support ticket not found.");

  await auditLogRepository.log({
    actorUserId: adminUserId,
    actorEmail: adminEmail,
    action: "support_ticket_assigned",
    targetType: "support_ticket",
    targetId: ticketId,
    summary: assignToUserId
      ? `Assigned support ticket "${ticket.subject}" to another admin.`
      : `Unassigned support ticket "${ticket.subject}".`,
  });

  return ticket;
}

async function setCategory(
  adminUserId: string,
  adminEmail: string,
  ticketId: string,
  category: SupportTicketCategory,
): Promise<SupportTicket> {
  const ticket = await ticketAdminRepository.setCategory(ticketId, category);
  if (!ticket) throw new AppError("NOT_FOUND", "Support ticket not found.");

  await auditLogRepository.log({
    actorUserId: adminUserId,
    actorEmail: adminEmail,
    action: "support_ticket_category_changed",
    targetType: "support_ticket",
    targetId: ticketId,
    summary: `Changed support ticket "${ticket.subject}"'s category to "${category}".`,
  });

  return ticket;
}

async function getTimingStats(): Promise<TicketTimingStats> {
  return ticketAdminRepository.getTimingStats();
}

export const ticketAdminService = {
  listTickets,
  getTicketWithMessages,
  replyToTicket,
  updateStatus,
  assignTicket,
  setCategory,
  getTimingStats,
};
