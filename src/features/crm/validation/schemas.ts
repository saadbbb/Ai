import { z } from "zod";
import { leadStageEnum } from "@/db/schema";

export const createLeadFromConversationSchema = z.object({
  conversationId: z.string().uuid(),
});

export const updateLeadStageSchema = z.object({
  leadId: z.string().uuid(),
  stage: z.enum(leadStageEnum.enumValues),
});
