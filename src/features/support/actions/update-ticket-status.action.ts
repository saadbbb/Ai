"use server";

import type { SupportTicket } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { ticketAdminService } from "../services/ticket-admin.service";
import { updateTicketStatusSchema } from "../validation/schemas";

export async function updateTicketStatusAction(input: unknown): Promise<ActionResult<SupportTicket>> {
  const parsed = updateTicketStatusSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requirePlatformAdmin();

  try {
    const ticket = await ticketAdminService.updateStatus(admin.id, admin.email, parsed.data.ticketId, parsed.data.status);
    return actionOk(ticket);
  } catch (error) {
    return actionFail(error);
  }
}
