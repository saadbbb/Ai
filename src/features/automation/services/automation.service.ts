import "server-only";
import type {
  AppointmentStatus,
  Contact,
  LeadStage,
  OrderStatus,
  Workflow,
  WorkflowConditions,
  WorkflowExecution,
  WorkflowStatus,
  WorkflowTriggerConfig,
} from "@/db/schema";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { noteRepository } from "@/features/crm/repository/note.repository";
import { taskRepository } from "@/features/crm/repository/task.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
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
  | { type: "appointment_status_changed"; contactId: string; status: AppointmentStatus }
  | { type: "tag_added"; contactId: string; tag: string }
  | { type: "message_received"; contactId: string }
  | { type: "message_replied"; contactId: string }
  | { type: "ai_failed"; contactId: string };

/** Lead stages that mean "this lead is no longer actionable" — see the create_lead action's dedup check. */
const TERMINAL_LEAD_STAGES: readonly LeadStage[] = ["won", "lost", "cancelled"];

/** An action is retried this many times total before the run is logged as a failure. */
const MAX_ACTION_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    workflow.triggerType === "appointment_created" ||
    workflow.triggerType === "tag_added" ||
    workflow.triggerType === "message_received" ||
    workflow.triggerType === "message_replied" ||
    workflow.triggerType === "ai_failed"
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
  if (event.type === "tag_added") return { tag: event.tag };
  return {};
}

/**
 * No rules = unconditional (every workflow before conditions existed keeps
 * working unchanged). A missing contact fails closed rather than matching
 * everything — a workflow with conditions set should never fire blind.
 */
function evaluateConditions(conditions: WorkflowConditions | null, contact: Contact | null): boolean {
  if (!conditions || conditions.rules.length === 0) return true;
  if (!contact) return false;

  const results = conditions.rules.map((rule) => {
    if (rule.field === "tag") return contact.tags.includes(rule.value);
    if (rule.field === "language") return contact.language === rule.value;
    return false;
  });

  return conditions.matchType === "any" ? results.some(Boolean) : results.every(Boolean);
}

async function runAction(
  workspaceId: string,
  workflow: Workflow,
  event: AutomationEvent,
  contact: Contact | null,
): Promise<string | null> {
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

  if (workflow.actionType === "create_task") {
    const title = workflow.actionConfig.taskTitle;
    if (!title) throw new AppError("VALIDATION_ERROR", "Workflow is missing a task title.");

    let dueAt: Date | null = null;
    if (workflow.actionConfig.taskDueInDays) {
      dueAt = new Date();
      dueAt.setUTCDate(dueAt.getUTCDate() + workflow.actionConfig.taskDueInDays);
    }

    const task = await taskRepository.create({
      workspaceId,
      contactId: event.contactId,
      title,
      dueAt,
      priority: workflow.actionConfig.taskPriority ?? "medium",
      createdByUserId: null,
    });
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "task_created",
      actor: { type: "automation" },
      summary: `Task "${task.title}" created by automation "${workflow.name}".`,
    });
    return contact ? `Created task "${task.title}" for ${contact.fullName}` : `Created task "${task.title}"`;
  }

  if (workflow.actionType === "create_note") {
    const content = workflow.actionConfig.noteContent;
    if (!content) throw new AppError("VALIDATION_ERROR", "Workflow is missing note content.");

    await noteRepository.create({
      workspaceId,
      contactId: event.contactId,
      content: content.replaceAll("{{contactName}}", contact?.fullName ?? ""),
      pinned: false,
      authorUserId: null,
    });
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "note_added",
      actor: { type: "automation" },
      summary: `Note added by automation "${workflow.name}".`,
    });
    return contact ? `Added a note to ${contact.fullName}` : "Added a note";
  }

  if (workflow.actionType === "update_contact_language") {
    const language = workflow.actionConfig.contactLanguage as Contact["language"];
    if (!language) throw new AppError("VALIDATION_ERROR", "Workflow is missing a language to set.");

    const updated = await contactRepository.update(event.contactId, workspaceId, { language });
    if (!updated) throw new AppError("NOT_FOUND", "Contact not found.");

    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "contact_updated",
      actor: { type: "automation" },
      summary: `Language set to "${language}" by automation "${workflow.name}".`,
    });
    return contact ? `Set ${contact.fullName}'s language to "${language}"` : `Set language to "${language}"`;
  }

  if (workflow.actionType === "create_lead") {
    const existingLeads = await leadRepository.findByContactId(event.contactId, workspaceId);
    const hasOpenLead = existingLeads.some((lead) => !TERMINAL_LEAD_STAGES.includes(lead.stage));
    if (hasOpenLead) {
      return contact ? `${contact.fullName} already has an open lead — skipped` : "Contact already has an open lead — skipped";
    }

    await leadRepository.create({ workspaceId, contactId: event.contactId, conversationId: null });
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "lead_created",
      actor: { type: "automation" },
      summary: `Lead created by automation "${workflow.name}".`,
    });
    await dispatch(workspaceId, { type: "lead_created", contactId: event.contactId });

    return contact ? `Created a lead for ${contact.fullName}` : "Created a lead";
  }

  if (workflow.actionType === "close_conversation") {
    const conversations = await conversationRepository.findByContactId(event.contactId, workspaceId);
    const openConversation = conversations.find((item) => item.conversation.status === "open");
    if (!openConversation) {
      throw new AppError("NOT_FOUND", "This contact has no open conversation to close.");
    }

    await conversationRepository.updateStatus(openConversation.conversation.id, workspaceId, "closed");
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "conversation_closed",
      actor: { type: "automation" },
      summary: `Conversation closed by automation "${workflow.name}".`,
      link: `/dashboard/inbox/${openConversation.conversation.id}`,
    });

    return contact ? `Closed the conversation with ${contact.fullName}` : "Closed the conversation";
  }

  return null;
}

async function runAndLog(
  workspaceId: string,
  workflow: Workflow,
  event: AutomationEvent,
  contact: Contact | null,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ACTION_ATTEMPTS; attempt++) {
    try {
      const summary = await runAction(workspaceId, workflow, event, contact);
      await workflowRepository.logExecution({
        workspaceId,
        workflowId: workflow.id,
        success: true,
        summary,
        retryCount: attempt - 1,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ACTION_ATTEMPTS) {
        console.warn(`[automation] workflow "${workflow.name}" (${workflow.id}) attempt ${attempt} failed, retrying:`, error);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  console.error(`[automation] workflow "${workflow.name}" (${workflow.id}) failed after ${MAX_ACTION_ATTEMPTS} attempts:`, lastError);
  await workflowRepository.logExecution({
    workspaceId,
    workflowId: workflow.id,
    success: false,
    errorMessage: lastError instanceof Error ? lastError.message : "Unknown error",
    retryCount: MAX_ACTION_ATTEMPTS - 1,
  });
}

/**
 * Fires whenever something automation-relevant happens elsewhere in the app
 * (a lead's stage changes, an order's status changes, the AI hands a
 * conversation to a human). Never throws back to the caller — a broken
 * automation must never break the CRM action that triggered it. Conditions
 * (see evaluateConditions) are checked once, here, at trigger time — a
 * delayed workflow that didn't match the conditions when the event happened
 * is never queued, regardless of what the contact looks like later. A
 * workflow with delayDays set doesn't run yet — it's queued in
 * workflow_pending_runs for processDueRuns() to pick up once due. Every
 * immediate attempt (success or failure) is logged to workflow_executions
 * right away.
 */
async function dispatch(workspaceId: string, event: AutomationEvent): Promise<void> {
  try {
    const workflows = await workflowRepository.findActiveByTrigger(workspaceId, event.type);
    const triggerMatches = workflows.filter((workflow) => matchesTrigger(workflow, event));
    if (triggerMatches.length === 0) return;

    const contact = await contactRepository.findById(event.contactId, workspaceId);
    const matching = triggerMatches.filter((workflow) => evaluateConditions(workflow.conditions, contact));

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

      await runAndLog(workspaceId, workflow, event, contact);
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
        const contact = await contactRepository.findById(pendingRun.contactId, pendingRun.workspaceId);
        await runAndLog(pendingRun.workspaceId, workflow, event, contact);
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
    actionConfig: {
      tag: input.actionTag,
      subject: input.actionSubject,
      message: input.actionMessage,
      taskTitle: input.actionTaskTitle,
      taskPriority: input.actionTaskPriority,
      taskDueInDays: input.actionTaskDueInDays,
      noteContent: input.actionNoteContent,
      contactLanguage: input.actionContactLanguage,
    },
    conditions:
      input.conditions && input.conditions.length > 0
        ? { matchType: input.conditionsMatchType ?? "all", rules: input.conditions }
        : null,
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
