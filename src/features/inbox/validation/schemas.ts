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

export const setPinnedSchema = conversationIdSchema.extend({
  pinned: z.boolean(),
});

export const setPrioritySchema = conversationIdSchema.extend({
  priority: z.enum(["normal", "high"]),
});

export const assignConversationSchema = conversationIdSchema.extend({
  userId: z.string().uuid(),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(2000),
});

export const deleteTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

export const suggestReplySchema = conversationIdSchema;

export const handToHumanSchema = conversationIdSchema;
