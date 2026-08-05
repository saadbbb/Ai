import "server-only";
import type {
  AppointmentStatus,
  LeadStage,
  OrderStatus,
  Workflow,
  WorkflowExecution,
  WorkflowStatus,
  WorkflowTriggerConfig,
} from "@/db/schema";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
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
  | { type: "conversation_handed_over"; contactId: string }
  | { type: "order_created"; contactId: string }
  | { type: "lead_created"; contactId: string }
  | { type: "appointment_created"; contactId: string }
  | { type: "appointment_status_changed"; contactId: string; status: AppointmentStatus };

function matchesTrigger(workflow: Workflow, event: AutomationEvent): boolean {
  if (workflow.triggerType === "lead_stage_changed" && event.type === "lead_stage_changed") {
    return workflow.triggerConfig.stage === event.stage;
  }
  if (workflow.triggerType === "order_status_changed" && event.type === "order_status_changed") {
    return workflow.triggerConfig.status === event.status;
  }
  if (workflow.triggerType === "appointment_status_changed" && event.type === "appointment_status_changed") {
    return workflow.triggerConfig.status === event.status;
  }
  if (
    workflow.triggerType === "order_created" ||
    workflow.triggerType === "lead_created" ||
    workflow.triggerType === "appointment_created"
  ) {
    return workflow.triggerType === event.type;
  }
  return workflow.triggerType === "conversation_handed_over" && event.type === "conversation_handed_over";
}

/** The subset of an AutomationEvent that survives a round trip through workflow_pending_runs' jsonb column. */
function eventToPayload(event: AutomationEvent): WorkflowTriggerConfig {
  if (event.type === "lead_stage_changed") return { stage: event.stage };
  if (event.type === "order_status_changed" || event.type === "appointment_status_changed") {
    return { status: event.status };
  }
  return {};
}

async function runAction(workspaceId: string, workflow: Workflow, event: AutomationEvent): Promise<string | null> {
  const contact = await contactRepository.findById(event.contactId, workspaceId);

  if (workflow.actionType === "add_contact_tag") {
    const tag = workflow.actionConfig.tag;
    if (!tag) throw new AppError("VALIDATION_ERROR", "Workflow is missing a tag to add.");
    await contactRepository.addTag(event.contactId, workspaceId, tag);
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "contact_tagged",
      actor: { type: "automation" },
      summary: `Tagged with "${tag}" by automation "${workflow.name}".`,
    });
    return contact ? `Tagged ${contact.fullName} with "${tag}"` : `Tagged contact with "${tag}"`;
  }

  if (workflow.actionType === "remove_contact_tag") {
    const tag = workflow.actionConfig.tag;
    if (!tag) throw new AppError("VALIDATION_ERROR", "Workflow is missing a tag to remove.");
    await contactRepository.removeTag(event.contactId, workspaceId, tag);
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "contact_untagged",
      actor: { type: "automation" },
      summary: `Removed tag "${tag}" by automation "${workflow.name}".`,
    });
    return contact ? `Removed "${tag}" from ${contact.fullName}` : `Removed tag "${tag}"`;
  }

  if (workflow.actionType === "notify_owner_email") {
    const message = (workflow.actionConfig.message ?? "").replaceAll("{{contactName}}", contact?.fullName ?? "");
    const subject = workflow.actionConfig.subject || workflow.name;

    // In-app and email are independent channels — the in-app notification is
    // unconditional, created before the owner/email lookup even runs, so it
    // never gets skipped by an email failure OR a missing owner (Resend is
    // still sandboxed, see DEFERRED_TASKS.md, so email delivery can't be
    // relied on for every owner yet; the bell icon is the channel guaranteed
    // to reach them).
    await notificationRepository.create({
      workspaceId,
      type: "automation",
      title: subject,
      message,
      link: `/dashboard/automations/${workflow.id}`,
    });

    try {
      const ownerUserId = await membershipRepository.findOwnerUserId(workspaceId);
      const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;
      if (!owner) throw new AppError("INTERNAL_ERROR", "Workspace has no owner to email.");

      await emailService.sendNotificationEmail({ to: owner.email, subject, text: message });
      return `Notified owner (in-app + emailed ${owner.email})`;
    } catch (error) {
      console.error(`[automation] notify_owner_email email failed for workflow ${workflow.id}:`, error);
      return "Notified owner (in-app only — email failed)";
    }
  }

  return null;
}

async function runAndLog(workspaceId: string, workflow: Workflow, event: AutomationEvent): Promise<void> {
  try {
    const summary = await runAction(workspaceId, workflow, event);
    await workflowRepository.logExecution({ workspaceId, workflowId: workflow.id, success: true, summary });
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

/**
 * Fires whenever something automation-relevant happens elsewhere in the app
 * (a lead's stage changes, an order's status changes, the AI hands a
 * conversation to a human). Never throws back to the caller — a broken
 * automation must never break the CRM action that triggered it. A workflow
 * with delayDays set doesn't run yet — it's queued in workflow_pending_runs
 * for processDueRuns() to pick up once due. Every immediate attempt (success
 * or failure) is logged to workflow_executions right away.
 */
async function dispatch(workspaceId: string, event: AutomationEvent): Promise<void> {
  try {
    const workflows = await workflowRepository.findActiveByTrigger(workspaceId, event.type);
    const matching = workflows.filter((workflow) => matchesTrigger(workflow, event));

    for (const workflow of matching) {
      if (workflow.delayDays && workflow.delayDays > 0) {
        const runAfter = new Date();
        runAfter.setUTCDate(runAfter.getUTCDate() + workflow.delayDays);
        await workflowRepository.createPendingRun({
          workspaceId,
          workflowId: workflow.id,
          contactId: event.contactId,
          eventType: event.type,
          eventPayload: eventToPayload(event),
          runAfter,
        });
        continue;
      }

      await runAndLog(workspaceId, workflow, event);
    }
  } catch (error) {
    console.error("[automation] dispatch failed:", error);
  }
}

/**
 * Drains workflow_pending_runs — called by the daily automation-delays cron.
 * Reconstructs each queued AutomationEvent from its stored type+payload and
 * runs it through the same runAction/logExecution path as an immediate
 * dispatch. Skips (and still clears) a pending run whose workflow was paused
 * or deleted since it was queued — a delayed automation shouldn't fire after
 * the user turned it off.
 */
async function processDueRuns(): Promise<void> {
  const dueRuns = await workflowRepository.findDuePendingRuns(new Date());

  for (const pendingRun of dueRuns) {
    try {
      const workflow = await workflowRepository.findById(pendingRun.workflowId, pendingRun.workspaceId);
      if (workflow && workflow.status === "active") {
        const event = {
          type: pendingRun.eventType,
          contactId: pendingRun.contactId,
          ...pendingRun.eventPayload,
        } as AutomationEvent;
        await runAndLog(pendingRun.workspaceId, workflow, event);
      }
    } catch (error) {
      console.error(`[automation] pending run ${pendingRun.id} failed:`, error);
    } finally {
      await workflowRepository.deletePendingRun(pendingRun.id);
    }
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
    delayDays: input.delayDays || null,
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
  processDueRuns,
  listWorkflows,
  getWorkflowWithExecutions,
  createWorkflow,
  setWorkflowStatus,
  deleteWorkflow,
};
