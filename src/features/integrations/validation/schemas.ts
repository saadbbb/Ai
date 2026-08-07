import { z } from "zod";

export const AUTOMATION_EVENT_TYPES = [
  "lead_stage_changed",
  "order_status_changed",
  "conversation_handed_over",
  "order_created",
  "lead_created",
  "appointment_created",
  "appointment_status_changed",
  "tag_added",
  "message_received",
  "message_replied",
  "ai_failed",
] as const;

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const revokeApiKeySchema = z.object({
  id: z.string().uuid(),
});

export const createWebhookSubscriptionSchema = z.object({
  url: z.string().trim().url().max(2000),
  eventTypes: z.array(z.enum(AUTOMATION_EVENT_TYPES)).min(1, "Select at least one event."),
});

export const setWebhookSubscriptionActiveSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export const deleteWebhookSubscriptionSchema = z.object({
  id: z.string().uuid(),
});
