"use server";

import type { SupportTicketMessage } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { ticketService } from "../services/ticket.service";
import { replyTicketSchema } from "../validation/schemas";

export async function replyTicketAction(input: unknown): Promise<ActionResult<SupportTicketMessage>> {
  const parsed = replyTicketSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "support.tickets.view");

  try {
    const message = await ticketService.replyToTicket(workspace.id, user.id, user.name ?? user.email ?? user.phone ?? "Unknown", parsed.data.ticketId, parsed.data.content);
    return actionOk(message);
  } catch (error) {
    return actionFail(error);
  }
}
