import { z } from "zod";

export const startConversationSchema = z.object({
  contactName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).optional(),
  initialMessage: z.string().trim().min(1).max(4000),
});

export const conversationIdSchema = z.object({
  conversationId: z.string().uuid(),
});

export const logCustomerMessageSchema = conversationIdSchema.extend({
  content: z.string().trim().min(1).max(4000),
});

export const sendAgentReplySchema = conversationIdSchema.extend({
  content: z.string().trim().min(1).max(4000),
});
