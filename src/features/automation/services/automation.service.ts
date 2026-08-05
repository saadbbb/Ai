import "server-only";
import type { LeadStage, OrderStatus, Workflow, WorkflowExecution, WorkflowStatus } from "@/db/schema";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { userRepository } from "@/features/auth/repository/user.repository";
import { emailService } from "@/lib/email";
import { AppError } from "@/lib/errors/app-error";
import { workflowRepository } from "../repository/workflow.repository";
import type { createWorkflowSchema } from "../validation/schemas";
import type { z } from "zod";

export type AutomationEvent =
  | { type: "lead_stage_changed"; contactId: string; stage: LeadStage }
  | { type: "order_status_changed"; contactId: string; status: OrderStatus }
  | { type: "conversation_handed_over"; contactId: string };

function matchesTrigger(workflow: Workflow, event: AutomationEvent): boolean {
  if (workflow.triggerType === "lead_stage_changed" && event.type === "lead_stage_changed") {
    return workflow.triggerConfig.stage === event.stage;
  }
  if (workflow.triggerType === "order_status_changed" && event.type === "order_status_changed") {
    return workflow.triggerConfig.status === event.status;
  }
  return workflow.triggerType === "conversation_handed_over" && event.type === "conversation_handed_over";
}

async function runAction(workspaceId: string, workflow: Workflow, event: AutomationEvent): Promise<string | null> {
  const contact = await contactRepository.findById(event.contactId, workspaceId);

  if (workflow.actionType === "add_contact_tag") {
    const tag = workflow.actionConfig.tag;
    if (!tag) throw new AppError("VALIDATION_ERROR", "Workflow is missing a tag to add.");
    await contactRepository.addTag(event.contactId, workspaceId, tag);
    return contact ? `Tagged ${contact.fullName} with "${tag}"` : `Tagged contact with "${tag}"`;
  }

  if (workflow.actionType === "notify_owner_email") {
    const ownerUserId = await membershipRepository.findOwnerUserId(workspaceId);
    const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;
    if (!owner) throw new AppError("INTERNAL_ERROR", "Workspace has no owner to notify.");

    const message = (workflow.actionConfig.message ?? "").replaceAll("{{contactName}}", contact?.fullName ?? "");
    await emailService.sendNotificationEmail({
      to: owner.email,
      subject: workflow.actionConfig.subject || workflow.name,
      text: message,
    });
    return `Emailed ${owner.email}`;
  }

  return null;
}

/**
 * Fires whenever something automation-relevant happens elsewhere in the app
 * (a lead's stage changes, an order's status changes, the AI hands a
 * conversation to a human). Never throws back to the caller — a broken
 * automation must never break the CRM action that triggered it. Every
 * attempt (success or failure) is logged to workflow_executions.
 */
async function dispatch(workspaceId: string, event: AutomationEvent): Promise<void> {
  try {
    const workflows = await workflowRepository.findActiveByTrigger(workspaceId, event.type);
    const matching = workflows.filter((workflow) => matchesTrigger(workflow, event));

    for (const workflow of matching) {
      try {
        const summary = await runAction(workspaceId, workflow, event);
        await workflowRepository.logExecution({
          workspaceId,
          workflowId: workflow.id,
          success: true,
          summary,
        });
      } catch (error) {
        console.error(`[automation] workflow "${workflow.name}" (${workflow.id}) failed:`, error);
        await workflowRepository.logExecution({
          workspaceId,
          workflowId: workflow.id,
          success: false,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  } catch (error) {
    console.error("[automation] dispatch failed:", error);
  }
}

async function listWorkflows(workspaceId: string): Promise<Workflow[]> {
  return workflowRepository.findByWorkspaceId(workspaceId);
}

async function getWorkflowWithExecutions(
  workspaceId: string,
  workflowId: string,
): Promise<{ workflow: Workflow; executions: WorkflowExecution[] }> {
  const workflow = await workflowRepository.findById(workflowId, workspaceId);
  if (!workflow) {
    throw new AppError("NOT_FOUND", "Workflow not found.");
  }
  const executions = await workflowRepository.findExecutionsByWorkflowId(workflowId, workspaceId);
  return { workflow, executions };
}

async function createWorkflow(workspaceId: string, input: z.infer<typeof createWorkflowSchema>): Promise<Workflow> {
  return workflowRepository.create({
    workspaceId,
    name: input.name,
    triggerType: input.triggerType,
    triggerConfig: { stage: input.triggerStage, status: input.triggerStatus },
    actionType: input.actionType,
    actionConfig: { tag: input.actionTag, subject: input.actionSubject, message: input.actionMessage },
  });
}

async function setWorkflowStatus(workspaceId: string, workflowId: string, status: WorkflowStatus): Promise<Workflow> {
  const workflow = await workflowRepository.updateStatus(workflowId, workspaceId, status);
  if (!workflow) {
    throw new AppError("NOT_FOUND", "Workflow not found.");
  }
  return workflow;
}

async function deleteWorkflow(workspaceId: string, workflowId: string): Promise<void> {
  await workflowRepository.delete(workflowId, workspaceId);
}

export const automationService = {
  dispatch,
  listWorkflows,
  getWorkflowWithExecutions,
  createWorkflow,
  setWorkflowStatus,
  deleteWorkflow,
};
