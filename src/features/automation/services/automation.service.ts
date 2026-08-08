import "server-only";
import type {
  AppointmentStatus,
  Contact,
  LeadStage,
  OrderStatus,
  Workflow,
  WorkflowApprovalStatus,
  WorkflowConditions,
  WorkflowExecution,
  WorkflowStatus,
  WorkflowTriggerConfig,
} from "@/db/schema";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { calculateLeadScore } from "@/features/crm/lib/lead-score";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { noteRepository } from "@/features/crm/repository/note.repository";
import { taskRepository } from "@/features/crm/repository/task.repository";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import { isWithinWorkingHours } from "@/features/ai/lib/working-hours";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { integrationService } from "@/features/integrations/services/integration.service";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { messageRepository } from "@/features/inbox/repository/message.repository";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { orderGrandTotal } from "@/features/orders/lib/order-total";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { userRepository } from "@/features/auth/repository/user.repository";
import { emailService } from "@/lib/email";
import { AppError } from "@/lib/errors/app-error";
import { enqueueAutomationEvent } from "@/lib/queue/automation-queue";
import { safeWebhookPost } from "../lib/safe-webhook-fetch";
import { workflowApprovalRepository } from "../repository/workflow-approval.repository";
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
  | { type: "ai_failed"; contactId: string }
  | { type: "conversation_assigned"; contactId: string };

/** Lead stages that mean "this lead is no longer actionable" — see the create_lead action's dedup check. */
const TERMINAL_LEAD_STAGES: readonly LeadStage[] = ["won", "lost", "cancelled"];

/**
 * Hard cap on how many workflows trigger_another_workflow can chain through in
 * one run, independent of the id-based cycle check below — belt-and-suspenders
 * against runaway chains even if they never repeat the exact same workflow id.
 */
const MAX_WORKFLOW_CHAIN_DEPTH = 5;

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
    workflow.triggerType === "ai_failed" ||
    workflow.triggerType === "conversation_assigned"
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
 * Recomputes the same deterministic score crmService.listLeads/lead-score.ts
 * use, but for a single contact's most relevant lead (the first non-terminal
 * one, falling back to the most recent) — condition evaluation only ever
 * runs for workflows that already matched a trigger, so this stays bounded
 * regardless of workspace size, unlike a workspace-wide recompute.
 */
async function getContactLeadScore(workspaceId: string, contact: Contact): Promise<number> {
  const contactLeads = await leadRepository.findByContactId(contact.id, workspaceId);
  if (contactLeads.length === 0) return 0;
  const relevantLead = contactLeads.find((lead) => !TERMINAL_LEAD_STAGES.includes(lead.stage)) ?? contactLeads[0];

  const [messageCounts, orders, appointments] = await Promise.all([
    relevantLead.conversationId
      ? messageRepository.countByConversationIds([relevantLead.conversationId])
      : Promise.resolve(new Map<string, number>()),
    orderRepository.findByContactId(contact.id, workspaceId),
    appointmentRepository.findByContactId(contact.id, workspaceId),
  ]);

  return calculateLeadScore({
    messageCount: relevantLead.conversationId ? (messageCounts.get(relevantLead.conversationId) ?? 0) : 0,
    hasOrder: orders.length > 0,
    hasAppointment: appointments.length > 0,
    tags: contact.tags,
    stage: relevantLead.stage,
    lastContactAt: contact.lastContactAt,
  });
}

/** The contact's most recent order total — 0 if they have none. */
async function getContactLatestOrderValue(workspaceId: string, contact: Contact): Promise<number> {
  const orders = await orderRepository.findByContactId(contact.id, workspaceId);
  if (orders.length === 0) return 0;
  return orderGrandTotal(orders[0].items, orders[0].order);
}

/**
 * No rules = unconditional (every workflow before conditions existed keeps
 * working unchanged). A missing contact fails closed rather than matching
 * everything — a workflow with conditions set should never fire blind.
 * `lead_score`/`order_value` rule values are parsed as "greater than or equal
 * to" thresholds (matching the spec's own examples: "Lead Score > 80", "Order
 * Value > 100"); `working_hours` ignores its `value` field entirely — it's a
 * pure boolean check against the workspace's configured hours.
 */
async function evaluateConditions(
  workspaceId: string,
  conditions: WorkflowConditions | null,
  contact: Contact | null,
): Promise<boolean> {
  if (!conditions || conditions.rules.length === 0) return true;
  if (!contact) return false;

  const results = await Promise.all(
    conditions.rules.map(async (rule) => {
      if (rule.field === "tag") return contact.tags.includes(rule.value);
      if (rule.field === "language") return contact.language === rule.value;
      if (rule.field === "lead_score") {
        const threshold = Number(rule.value);
        if (Number.isNaN(threshold)) return false;
        return (await getContactLeadScore(workspaceId, contact)) >= threshold;
      }
      if (rule.field === "order_value") {
        const threshold = Number(rule.value);
        if (Number.isNaN(threshold)) return false;
        return (await getContactLatestOrderValue(workspaceId, contact)) >= threshold;
      }
      if (rule.field === "working_hours") {
        const agent = await aiAgentRepository.findByWorkspaceId(workspaceId);
        return isWithinWorkingHours(agent?.workingHours);
      }
      return false;
    }),
  );

  return conditions.matchType === "any" ? results.some(Boolean) : results.every(Boolean);
}

async function runAction(
  workspaceId: string,
  workflow: Workflow,
  event: AutomationEvent,
  contact: Contact | null,
  chain: ReadonlySet<string>,
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
      type: "ai",
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

  if (workflow.actionType === "assign_agent") {
    const assignedUserId = workflow.actionConfig.assignedUserId;
    if (!assignedUserId) throw new AppError("VALIDATION_ERROR", "Workflow is missing an agent to assign.");

    const member = await membershipRepository.findByUserAndWorkspace(assignedUserId, workspaceId);
    if (!member) throw new AppError("NOT_FOUND", "The assigned team member is no longer part of this workspace.");

    const conversations = await conversationRepository.findByContactId(event.contactId, workspaceId);
    const targetConversation = conversations[0]; // most recent — findByContactId orders by lastMessageAt/createdAt desc
    if (!targetConversation) throw new AppError("NOT_FOUND", "This contact has no conversation to assign.");

    await conversationRepository.assign(targetConversation.conversation.id, workspaceId, assignedUserId);
    const assignedUser = await userRepository.findById(assignedUserId);
    const assigneeLabel = assignedUser?.email ?? "a team member";
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "conversation_assigned",
      actor: { type: "automation" },
      summary: `Conversation assigned to ${assigneeLabel} by automation "${workflow.name}".`,
      link: `/dashboard/inbox/${targetConversation.conversation.id}`,
    });
    await notificationRepository.create({
      workspaceId,
      type: "assignment",
      title: contact ? `Assigned: ${contact.fullName}` : "Conversation assigned",
      message: `${contact ? `${contact.fullName}'s conversation` : "A conversation"} was assigned to ${assigneeLabel} by automation "${workflow.name}".`,
      link: `/dashboard/inbox/${targetConversation.conversation.id}`,
    });

    return contact
      ? `Assigned ${contact.fullName}'s conversation to ${assigneeLabel}`
      : `Assigned the conversation to ${assigneeLabel}`;
  }

  if (workflow.actionType === "webhook_call") {
    const url = workflow.actionConfig.webhookUrl;
    if (!url) throw new AppError("VALIDATION_ERROR", "Workflow is missing a webhook URL.");

    await safeWebhookPost(url, {
      event: event.type,
      workflow: { id: workflow.id, name: workflow.name },
      contact: contact
        ? { id: contact.id, fullName: contact.fullName, phone: contact.phone, email: contact.email }
        : { id: event.contactId },
      message: (workflow.actionConfig.message ?? "").replaceAll("{{contactName}}", contact?.fullName ?? ""),
    });

    return `Sent webhook to ${new URL(url).hostname}`;
  }

  if (workflow.actionType === "trigger_another_workflow") {
    const targetWorkflowId = workflow.actionConfig.targetWorkflowId;
    if (!targetWorkflowId) throw new AppError("VALIDATION_ERROR", "Workflow is missing a target workflow to trigger.");
    if (targetWorkflowId === workflow.id) {
      throw new AppError("VALIDATION_ERROR", "A workflow cannot trigger itself.");
    }
    if (chain.has(targetWorkflowId) || chain.size >= MAX_WORKFLOW_CHAIN_DEPTH) {
      return "Skipped triggering another workflow — would create a loop or exceed the chain limit";
    }

    const targetWorkflow = await workflowRepository.findById(targetWorkflowId, workspaceId);
    if (!targetWorkflow) throw new AppError("NOT_FOUND", "The target workflow no longer exists.");
    if (targetWorkflow.status !== "active") {
      return `Skipped triggering "${targetWorkflow.name}" — it is not active`;
    }

    await runAndLog(workspaceId, targetWorkflow, event, contact, new Set([...chain, targetWorkflowId]));
    return `Triggered workflow "${targetWorkflow.name}"`;
  }

  if (workflow.actionType === "create_order") {
    const { productId, quantity } = workflow.actionConfig;
    if (!productId) throw new AppError("VALIDATION_ERROR", "Workflow is missing a product to order.");

    const products = await productRepository.findByWorkspaceId(workspaceId);
    const product = products.find((item) => item.id === productId);
    if (!product) throw new AppError("NOT_FOUND", "The configured product no longer exists.");
    if (!product.price) throw new AppError("VALIDATION_ERROR", `Product "${product.name}" has no price set.`);

    const created = await orderRepository.create(
      { workspaceId, contactId: event.contactId, conversationId: null, notes: `Created by automation "${workflow.name}".` },
      [{ productId: product.id, name: product.name, unitPrice: product.price, quantity: quantity && quantity > 0 ? quantity : 1 }],
    );
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "order_created",
      actor: { type: "automation" },
      summary: `Order created by automation "${workflow.name}".`,
      link: `/dashboard/orders/${created.order.id}`,
    });
    await dispatch(workspaceId, { type: "order_created", contactId: event.contactId });

    return contact ? `Created an order for ${contact.fullName}` : "Created an order";
  }

  if (workflow.actionType === "book_appointment") {
    const { serviceId, daysFromNow } = workflow.actionConfig;
    if (!serviceId) throw new AppError("VALIDATION_ERROR", "Workflow is missing a service to book.");

    const services = await serviceRepository.findByWorkspaceId(workspaceId);
    const service = services.find((item) => item.id === serviceId);
    if (!service) throw new AppError("NOT_FOUND", "The configured service no longer exists.");

    const scheduledAt = new Date();
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + (daysFromNow && daysFromNow > 0 ? daysFromNow : 1));

    await appointmentRepository.create({
      workspaceId,
      contactId: event.contactId,
      serviceId: service.id,
      serviceName: service.name,
      conversationId: null,
      scheduledAt,
      durationMinutes: service.durationMinutes ?? 30,
      notes: `Booked by automation "${workflow.name}".`,
    });
    await activityRepository.log({
      workspaceId,
      contactId: event.contactId,
      type: "appointment_created",
      actor: { type: "automation" },
      summary: `Appointment booked by automation "${workflow.name}": ${service.name}.`,
    });
    await dispatch(workspaceId, { type: "appointment_created", contactId: event.contactId });

    return contact ? `Booked ${service.name} for ${contact.fullName}` : `Booked ${service.name}`;
  }

  if (workflow.actionType === "send_ai_reply") {
    const conversations = await conversationRepository.findByContactId(event.contactId, workspaceId);
    const openConversation = conversations.find((item) => item.conversation.status === "open");
    if (!openConversation) throw new AppError("NOT_FOUND", "This contact has no open conversation to reply in.");

    // Dynamic import, deliberately: ai.service.ts statically imports the tool
    // registry, which (via add-tag.tool.ts) imports this module — a static
    // top-level import here would create a circular module graph. Dynamic
    // import resolves after both modules have finished initializing.
    const { aiService } = await import("@/features/ai/services/ai.service");
    const history = await messageRepository.findByConversationId(openConversation.conversation.id, workspaceId);
    const chatHistory = history
      .filter((message) => message.senderType !== "system")
      .slice(-30)
      .map((message) => ({
        role: (message.senderType === "customer" ? "user" : "assistant") as "user" | "assistant",
        content: message.content,
      }));

    // No `context` passed — deliberately skips tool-calling for a workflow-triggered
    // proactive message (see the dynamic-import note above for why that matters).
    const result = await aiService.generateReply(workspaceId, chatHistory);
    const preview = result.text.length > 140 ? `${result.text.slice(0, 140)}…` : result.text;

    await messageRepository.create({
      workspaceId,
      conversationId: openConversation.conversation.id,
      senderType: "ai",
      content: result.text,
    });
    await conversationRepository.touchLastMessage(openConversation.conversation.id, workspaceId, preview, "ai");

    if (result.needsHumanHandover) {
      await conversationRepository.updateAiStatus(openConversation.conversation.id, workspaceId, "handed_over");
      await dispatch(workspaceId, { type: "conversation_handed_over", contactId: event.contactId });
    }

    return contact ? `Sent an AI reply to ${contact.fullName}` : "Sent an AI reply";
  }

  if (workflow.actionType === "request_approval") {
    await workflowApprovalRepository.create({
      workspaceId,
      workflowId: workflow.id,
      contactId: event.contactId,
      eventType: event.type,
      eventPayload: eventToPayload(event),
      instructions: workflow.actionConfig.message ?? null,
      onApproveWorkflowId: workflow.actionConfig.targetWorkflowId ?? null,
    });

    await notificationRepository.create({
      workspaceId,
      type: "automation",
      title: `Approval needed: "${workflow.name}"`,
      message:
        workflow.actionConfig.message ??
        (contact ? `Automation "${workflow.name}" needs your approval for ${contact.fullName}.` : `Automation "${workflow.name}" needs your approval.`),
      link: "/dashboard/automations",
    });

    return contact ? `Requested approval for ${contact.fullName}` : "Requested approval";
  }

  return null;
}

async function runAndLog(
  workspaceId: string,
  workflow: Workflow,
  event: AutomationEvent,
  contact: Contact | null,
  chain: ReadonlySet<string>,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ACTION_ATTEMPTS; attempt++) {
    try {
      const summary = await runAction(workspaceId, workflow, event, contact, chain);
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
  const errorMessage = lastError instanceof Error ? lastError.message : "Unknown error";
  await workflowRepository.logExecution({
    workspaceId,
    workflowId: workflow.id,
    success: false,
    errorMessage,
    retryCount: MAX_ACTION_ATTEMPTS - 1,
  });

  if (workflow.actionType === "webhook_call") {
    await notificationRepository.create({
      workspaceId,
      type: "webhook_failure",
      title: `Webhook failed: ${workflow.name}`,
      message: `The webhook for automation "${workflow.name}" failed after ${MAX_ACTION_ATTEMPTS} attempts: ${errorMessage}`,
      link: `/dashboard/automations/${workflow.id}`,
    });
  }
}

/**
 * Fires whenever something automation-relevant happens elsewhere in the app
 * (a lead's stage changes, an order's status changes, the AI hands a
 * conversation to a human). Never throws back to the caller — a broken
 * automation must never break the CRM action that triggered it.
 *
 * Enqueues the event for the dedicated worker process (scripts/automation-worker.ts)
 * instead of doing the work inline, so a slow action (a webhook call, an AI
 * reply) never blocks the request that triggered it — see PART 2/6 of the
 * spec. Falls back to running processEvent() inline when no Redis is
 * configured (see DEFERRED_TASKS.md) or the enqueue itself doesn't complete
 * quickly, so an event is never silently dropped.
 */
async function dispatch(workspaceId: string, event: AutomationEvent): Promise<void> {
  const queued = await enqueueAutomationEvent({ workspaceId, event });
  if (!queued) {
    await processEvent(workspaceId, event);
  }
}

/**
 * The actual work behind an automation event — condition matching, delay
 * queuing, and running matched workflows' actions. Runs either inline (via
 * dispatch(), when no queue is configured) or from the worker process after
 * dispatch() enqueues the event. Conditions (see evaluateConditions) are
 * checked once, here, at trigger time — a delayed workflow that didn't match
 * the conditions when the event happened is never queued, regardless of what
 * the contact looks like later. A workflow with delayDays set doesn't run
 * yet — it's queued in workflow_pending_runs for processDueRuns() to pick up
 * once due. Every immediate attempt (success or failure) is logged to
 * workflow_executions right away.
 */
async function processEvent(workspaceId: string, event: AutomationEvent): Promise<void> {
  try {
    // Fires unconditionally, independent of whether any workflow matches below —
    // webhook subscriptions are an always-on notification channel, not a workflow.
    await integrationService.notifyWebhookSubscribers(workspaceId, event);

    const workflows = await workflowRepository.findActiveByTrigger(workspaceId, event.type);
    const triggerMatches = workflows.filter((workflow) => matchesTrigger(workflow, event));
    if (triggerMatches.length === 0) return;

    const contact = await contactRepository.findById(event.contactId, workspaceId);
    const conditionResults = await Promise.all(
      triggerMatches.map((workflow) => evaluateConditions(workspaceId, workflow.conditions, contact)),
    );
    const matching = triggerMatches.filter((_, index) => conditionResults[index]);

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

      await runAndLog(workspaceId, workflow, event, contact, new Set([workflow.id]));
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
        await runAndLog(pendingRun.workspaceId, workflow, event, contact, new Set([workflow.id]));
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
      assignedUserId: input.actionAssignedUserId,
      webhookUrl: input.actionWebhookUrl,
      targetWorkflowId: input.actionTargetWorkflowId,
      productId: input.actionProductId,
      quantity: input.actionQuantity,
      serviceId: input.actionServiceId,
      daysFromNow: input.actionDaysFromNow,
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

async function listPendingApprovals(workspaceId: string) {
  return workflowApprovalRepository.findPendingByWorkspaceId(workspaceId);
}

/**
 * Approving runs `onApproveWorkflowId`'s action for the same contact/event
 * (see the workflowApprovals table comment) via the same runAndLog path
 * trigger_another_workflow uses, seeded with its own fresh chain so it still
 * gets loop protection. Rejecting — or an approval with no linked
 * workflow — just records the decision.
 */
async function decideApproval(
  workspaceId: string,
  approvalId: string,
  decision: Extract<WorkflowApprovalStatus, "approved" | "rejected">,
  userId: string,
): Promise<void> {
  const approval = await workflowApprovalRepository.decide(approvalId, workspaceId, decision, userId);
  if (!approval) {
    throw new AppError("NOT_FOUND", "This approval was not found or has already been decided.");
  }

  if (decision === "approved" && approval.onApproveWorkflowId) {
    const targetWorkflow = await workflowRepository.findById(approval.onApproveWorkflowId, workspaceId);
    if (targetWorkflow && targetWorkflow.status === "active") {
      const contact = await contactRepository.findById(approval.contactId, workspaceId);
      const event = { type: approval.eventType, contactId: approval.contactId, ...approval.eventPayload } as AutomationEvent;
      await runAndLog(workspaceId, targetWorkflow, event, contact, new Set([targetWorkflow.id]));
    }
  }
}

export const automationService = {
  dispatch,
  processEvent,
  processDueRuns,
  listWorkflows,
  getWorkflowWithExecutions,
  createWorkflow,
  setWorkflowStatus,
  deleteWorkflow,
  listPendingApprovals,
  decideApproval,
};
