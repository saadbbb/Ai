import { z } from "zod";

export const contactLifecycleStageSchema = z.enum(["lead", "customer", "repeat_customer", "vip", "loyal_customer"]);

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  segmentLifecycleStage: contactLifecycleStageSchema.optional(),
  segmentTag: z.string().trim().max(100).optional(),
});

export const sendCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

export const previewRecipientsSchema = z.object({
  segmentLifecycleStage: contactLifecycleStageSchema.optional(),
  segmentTag: z.string().trim().max(100).optional(),
});
