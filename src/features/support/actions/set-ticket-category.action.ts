"use server";

import type { SupportTicket } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { ticketAdminService } from "../services/ticket-admin.service";
import { setTicketCategorySchema } from "../validation/schemas";

export async function setTicketCategoryAction(input: unknown): Promise<ActionResult<SupportTicket>> {
  const parsed = setTicketCategorySchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const ticket = await ticketAdminService.setCategory(admin.id, admin.email, parsed.data.ticketId, parsed.data.category);
    return actionOk(ticket);
  } catch (error) {
    return actionFail(error);
  }
}
