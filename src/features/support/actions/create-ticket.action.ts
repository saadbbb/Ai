"use server";

import type { SupportTicket } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { ticketService } from "../services/ticket.service";
import { createTicketSchema } from "../validation/schemas";

export async function createTicketAction(input: unknown): Promise<ActionResult<SupportTicket>> {
  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "support.tickets.view");

  try {
    const ticket = await ticketService.createTicket(workspace.id, user.id, user.email, parsed.data);
    return actionOk(ticket);
  } catch (error) {
    return actionFail(error);
  }
}
