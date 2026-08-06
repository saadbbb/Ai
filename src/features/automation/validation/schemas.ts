import { z } from "zod";
import {
  appointmentStatusEnum,
  languageEnum,
  leadStageEnum,
  orderStatusEnum,
  taskPriorityEnum,
  workflowActionEnum,
  workflowTriggerEnum,
} from "@/db/schema";

const triggerStatusValues = [...new Set([...orderStatusEnum.enumValues, ...appointmentStatusEnum.enumValues])] as [
  string,
  ...string[],
];

const conditionRuleSchema = z.object({
  field: z.enum(["tag", "language"]),
  value: z.string().trim().min(1).max(100),
});

export const createWorkflowSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    triggerType: z.enum(workflowTriggerEnum.enumValues),
    triggerStage: z.enum(leadStageEnum.enumValues).optional(),
    triggerStatus: z.enum(triggerStatusValues).optional(),
    actionType: z.enum(workflowActionEnum.enumValues),
    actionTag: z.string().trim().max(60).optional(),
    actionSubject: z.string().trim().max(200).optional(),
    actionMessage: z.string().trim().max(2000).optional(),
    actionTaskTitle: z.string().trim().max(200).optional(),
    actionTaskPriority: z.enum(taskPriorityEnum.enumValues).optional(),
    actionTaskDueInDays: z.coerce.number().int().min(0).max(365).optional(),
    actionNoteContent: z.string().trim().max(2000).optional(),
    actionContactLanguage: z.enum(languageEnum.enumValues).optional(),
    actionAssignedUserId: z.string().uuid().optional(),
    actionWebhookUrl: z.string().trim().url().max(2000).startsWith("https://", "Must be a secure (https) URL.").optional(),
    actionTargetWorkflowId: z.string().uuid().optional(),
    conditions: z.array(conditionRuleSchema).max(5).optional(),
    conditionsMatchType: z.enum(["all", "any"]).optional(),
    delayDays: z.coerce.number().int().min(0).max(365).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.triggerType === "lead_stage_changed" && !data.triggerStage) {
      ctx.addIssue({ code: "custom", path: ["triggerStage"], message: "Pick a lead stage." });
    }
    if (
      (data.triggerType === "order_status_changed" || data.triggerType === "appointment_status_changed") &&
      !data.triggerStatus
    ) {
      ctx.addIssue({ code: "custom", path: ["triggerStatus"], message: "Pick a status." });
    }
    if ((data.actionType === "add_contact_tag" || data.actionType === "remove_contact_tag") && !data.actionTag) {
      ctx.addIssue({ code: "custom", path: ["actionTag"], message: "Enter a tag." });
    }
    if (data.actionType === "notify_owner_email" && !data.actionMessage) {
      ctx.addIssue({ code: "custom", path: ["actionMessage"], message: "Enter a message to send." });
    }
    if (data.actionType === "create_task" && !data.actionTaskTitle) {
      ctx.addIssue({ code: "custom", path: ["actionTaskTitle"], message: "Enter a task title." });
    }
    if (data.actionType === "create_note" && !data.actionNoteContent) {
      ctx.addIssue({ code: "custom", path: ["actionNoteContent"], message: "Enter note content." });
    }
    if (data.actionType === "update_contact_language" && !data.actionContactLanguage) {
      ctx.addIssue({ code: "custom", path: ["actionContactLanguage"], message: "Pick a language." });
    }
    if (data.actionType === "assign_agent" && !data.actionAssignedUserId) {
      ctx.addIssue({ code: "custom", path: ["actionAssignedUserId"], message: "Pick a team member." });
    }
    if (data.actionType === "webhook_call" && !data.actionWebhookUrl) {
      ctx.addIssue({ code: "custom", path: ["actionWebhookUrl"], message: "Enter a webhook URL." });
    }
    if (data.actionType === "trigger_another_workflow") {
      if (!data.actionTargetWorkflowId) {
        ctx.addIssue({ code: "custom", path: ["actionTargetWorkflowId"], message: "Pick a workflow to trigger." });
      }
    }
  });

export const workflowIdSchema = z.object({ workflowId: z.string().uuid() });
