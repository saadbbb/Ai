import { z } from "zod";

export const supportTicketPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const supportTicketStatusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);
export const supportTicketCategorySchema = z.enum(["billing", "technical", "account", "feature_request", "other"]);

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required.").max(200),
  message: z.string().trim().min(1, "Message is required."),
  priority: supportTicketPrioritySchema,
});

export const replyTicketSchema = z.object({
  ticketId: z.string().uuid(),
  content: z.string().trim().min(1, "Message is required."),
  isInternal: z.boolean().optional(),
});

export const updateTicketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: supportTicketStatusSchema,
});

export const assignTicketSchema = z.object({
  ticketId: z.string().uuid(),
  assignToUserId: z.string().uuid().nullable(),
});

export const setTicketCategorySchema = z.object({
  ticketId: z.string().uuid(),
  category: supportTicketCategorySchema,
});
