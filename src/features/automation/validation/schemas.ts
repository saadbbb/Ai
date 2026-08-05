import { z } from "zod";
import { leadStageEnum, orderStatusEnum, workflowActionEnum, workflowTriggerEnum } from "@/db/schema";

export const createWorkflowSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    triggerType: z.enum(workflowTriggerEnum.enumValues),
    triggerStage: z.enum(leadStageEnum.enumValues).optional(),
    triggerStatus: z.enum(orderStatusEnum.enumValues).optional(),
    actionType: z.enum(workflowActionEnum.enumValues),
    actionTag: z.string().trim().max(60).optional(),
    actionSubject: z.string().trim().max(200).optional(),
    actionMessage: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.triggerType === "lead_stage_changed" && !data.triggerStage) {
      ctx.addIssue({ code: "custom", path: ["triggerStage"], message: "Pick a lead stage." });
    }
    if (data.triggerType === "order_status_changed" && !data.triggerStatus) {
      ctx.addIssue({ code: "custom", path: ["triggerStatus"], message: "Pick an order status." });
    }
    if (data.actionType === "add_contact_tag" && !data.actionTag) {
      ctx.addIssue({ code: "custom", path: ["actionTag"], message: "Enter a tag to add." });
    }
    if (data.actionType === "notify_owner_email" && !data.actionMessage) {
      ctx.addIssue({ code: "custom", path: ["actionMessage"], message: "Enter a message to send." });
    }
  });

export const workflowIdSchema = z.object({ workflowId: z.string().uuid() });
