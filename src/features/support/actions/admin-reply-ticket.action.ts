"use server";

import type { SupportTicketMessage } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { ticketAdminService } from "../services/ticket-admin.service";
import { replyTicketSchema } from "../validation/schemas";

export async function adminReplyTicketAction(input: unknown): Promise<ActionResult<SupportTicketMessage>> {
  const parsed = replyTicketSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requirePlatformAdmin();

  try {
    const message = await ticketAdminService.replyToTicket(admin.id, admin.email, parsed.data.ticketId, parsed.data.content);
    return actionOk(message);
  } catch (error) {
    return actionFail(error);
  }
}
