import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Workflow } from "@/db/schema";

vi.mock("@/features/integrations/services/integration.service", () => ({
  integrationService: {
    notifyWebhookSubscribers: vi.fn(),
  },
}));

vi.mock("../repository/workflow.repository", () => ({
  workflowRepository: {
    findActiveByTrigger: vi.fn(),
    findById: vi.fn(),
    findByWorkspaceId: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    logExecution: vi.fn(),
    findExecutionsByWorkflowId: vi.fn(),
    createPendingRun: vi.fn(),
    findDuePendingRuns: vi.fn(),
    deletePendingRun: vi.fn(),
  },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: {
    findById: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: {
    log: vi.fn(),
  },
}));

vi.mock("@/features/crm/repository/task.repository", () => ({
  taskRepository: {
    create: vi.fn(),
  },
}));

vi.mock("@/features/crm/repository/note.repository", () => ({
  noteRepository: {
    create: vi.fn(),
  },
}));

vi.mock("@/features/crm/repository/lead.repository", () => ({
  leadRepository: {
    findByContactId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/features/inbox/repository/conversation.repository", () => ({
  conversationRepository: {
    findByContactId: vi.fn(),
    updateStatus: vi.fn(),
    assign: vi.fn(),
    touchLastMessage: vi.fn(),
    updateAiStatus: vi.fn(),
  },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: {
    create: vi.fn(),
  },
}));

vi.mock("@/features/workspace/repository/membership.repository", () => ({
  membershipRepository: {
    findOwnerUserId: vi.fn(),
    findByUserAndWorkspace: vi.fn(),
  },
}));

vi.mock("@/features/auth/repository/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  emailService: {
    sendNotificationEmail: vi.fn(),
  },
}));

vi.mock("../lib/safe-webhook-fetch", () => ({
  safeWebhookPost: vi.fn(),
}));

vi.mock("@/features/orders/repository/order.repository", () => ({
  orderRepository: {
    findByContactId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/features/appointments/repository/appointment.repository", () => ({
  appointmentRepository: {
    findByContactId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/features/inbox/repository/message.repository", () => ({
  messageRepository: {
    countByConversationIds: vi.fn(),
    findByConversationId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/features/ai/repository/ai-agent.repository", () => ({
  aiAgentRepository: {
    findByWorkspaceId: vi.fn(),
  },
}));

vi.mock("@/features/knowledge-base/repository/product.repository", () => ({
  productRepository: {
    findByWorkspaceId: vi.fn(),
  },
}));

vi.mock("@/features/knowledge-base/repository/service.repository", () => ({
  serviceRepository: {
    findByWorkspaceId: vi.fn(),
  },
}));

vi.mock("../repository/workflow-approval.repository", () => ({
  workflowApprovalRepository: {
    create: vi.fn(),
    decide: vi.fn(),
  },
}));

vi.mock("@/features/ai/services/ai.service", () => ({
  aiService: {
    generateReply: vi.fn(),
  },
}));

vi.mock("@/lib/queue/automation-queue", () => ({
  enqueueAutomationEvent: vi.fn(),
}));

const { workflowRepository } = await import("../repository/workflow.repository");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { taskRepository } = await import("@/features/crm/repository/task.repository");
const { noteRepository } = await import("@/features/crm/repository/note.repository");
const { leadRepository } = await import("@/features/crm/repository/lead.repository");
const { conversationRepository } = await import("@/features/inbox/repository/conversation.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { membershipRepository } = await import("@/features/workspace/repository/membership.repository");
const { userRepository } = await import("@/features/auth/repository/user.repository");
const { orderRepository } = await import("@/features/orders/repository/order.repository");
const { appointmentRepository } = await import("@/features/appointments/repository/appointment.repository");
const { messageRepository } = await import("@/features/inbox/repository/message.repository");
const { aiAgentRepository } = await import("@/features/ai/repository/ai-agent.repository");
const { productRepository } = await import("@/features/knowledge-base/repository/product.repository");
const { serviceRepository } = await import("@/features/knowledge-base/repository/service.repository");
const { workflowApprovalRepository } = await import("../repository/workflow-approval.repository");
const { aiService } = await import("@/features/ai/services/ai.service");
const { emailService } = await import("@/lib/email");
const { safeWebhookPost } = await import("../lib/safe-webhook-fetch");
const { integrationService } = await import("@/features/integrations/services/integration.service");
const { enqueueAutomationEvent } = await import("@/lib/queue/automation-queue");
const { automationService } = await import("./automation.service");

const WORKSPACE_ID = "workspace-1";
const CONTACT_ID = "contact-1";

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: "workflow-1",
    workspaceId: WORKSPACE_ID,
    name: "Test workflow",
    triggerType: "lead_created",
    triggerConfig: {},
    actionType: "add_contact_tag",
    actionConfig: {},
    conditions: null,
    status: "active",
    delayDays: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const CONTACT: Contact = {
  id: CONTACT_ID,
  workspaceId: WORKSPACE_ID,
  fullName: "Jane Customer",
  phone: null,
  whatsappId: null,
  instagramId: null,
  email: null,
  language: null,
  tags: [],
  notes: null,
  aiSummary: null,
  avatarUrl: null,
  country: null,
  city: null,
  source: null,
  lifecycleStage: "lead",
  assignedAgentId: null,
  lastContactAt: null,
  address: null,
  budget: null,
  preferredContactMethod: null,
  preferredProducts: [],
  birthDate: null,
  gender: null,
  timezone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Every existing test in this file exercises processEvent's logic directly, so
  // dispatch() must fall back to running inline (as it does today with no Redis
  // configured) unless a test explicitly opts into the "queued" path below.
  vi.mocked(enqueueAutomationEvent).mockResolvedValue(false);
  vi.mocked(contactRepository.findById).mockResolvedValue(CONTACT);
  vi.mocked(workflowRepository.logExecution).mockResolvedValue({} as never);
  vi.mocked(taskRepository.create).mockResolvedValue({ id: "task-1", title: "Follow up" } as never);
  vi.mocked(noteRepository.create).mockResolvedValue({ id: "note-1" } as never);
  vi.mocked(contactRepository.update).mockResolvedValue(CONTACT);
  vi.mocked(leadRepository.findByContactId).mockResolvedValue([]);
  vi.mocked(leadRepository.create).mockResolvedValue({ id: "lead-1", contactId: CONTACT_ID, stage: "new" } as never);
  vi.mocked(conversationRepository.findByContactId).mockResolvedValue([]);
  vi.mocked(membershipRepository.findByUserAndWorkspace).mockResolvedValue({ id: "member-1" } as never);
  vi.mocked(userRepository.findById).mockResolvedValue({ id: "user-1", email: "agent@example.com" } as never);
  vi.mocked(safeWebhookPost).mockResolvedValue(undefined);
  vi.mocked(orderRepository.findByContactId).mockResolvedValue([]);
  vi.mocked(appointmentRepository.findByContactId).mockResolvedValue([]);
  vi.mocked(messageRepository.countByConversationIds).mockResolvedValue(new Map());
  vi.mocked(aiAgentRepository.findByWorkspaceId).mockResolvedValue(null);
  vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([]);
  vi.mocked(serviceRepository.findByWorkspaceId).mockResolvedValue([]);
  vi.mocked(messageRepository.findByConversationId).mockResolvedValue([]);
  vi.mocked(messageRepository.create).mockResolvedValue({ id: "message-1" } as never);
  vi.mocked(conversationRepository.touchLastMessage).mockResolvedValue(undefined);
  vi.mocked(conversationRepository.updateAiStatus).mockResolvedValue(undefined);
  vi.mocked(integrationService.notifyWebhookSubscribers).mockResolvedValue(undefined);
});

describe("automationService.dispatch — matching", () => {
  it("matches lead_stage_changed only when the configured stage equals the event stage", async () => {
    const workflow = makeWorkflow({ triggerType: "lead_stage_changed", triggerConfig: { stage: "won" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_stage_changed", contactId: CONTACT_ID, stage: "won" });
    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(1);

    vi.mocked(workflowRepository.logExecution).mockClear();
    await automationService.dispatch(WORKSPACE_ID, {
      type: "lead_stage_changed",
      contactId: CONTACT_ID,
      stage: "lost",
    });
    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
  });

  it("matches appointment_status_changed only when the configured status equals the event status", async () => {
    const workflow = makeWorkflow({
      triggerType: "appointment_status_changed",
      triggerConfig: { status: "completed" },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, {
      type: "appointment_status_changed",
      contactId: CONTACT_ID,
      status: "no_show",
    });
    expect(workflowRepository.logExecution).not.toHaveBeenCalled();

    await automationService.dispatch(WORKSPACE_ID, {
      type: "appointment_status_changed",
      contactId: CONTACT_ID,
      status: "completed",
    });
    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(1);
  });

  it.each([
    "order_created",
    "lead_created",
    "appointment_created",
    "tag_added",
    "message_received",
    "message_replied",
    "ai_failed",
  ] as const)("matches the %s trigger on type alone (no config)", async (triggerType) => {
    const workflow = makeWorkflow({ triggerType });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(
      WORKSPACE_ID,
      triggerType === "tag_added"
        ? { type: triggerType, contactId: CONTACT_ID, tag: "VIP" }
        : { type: triggerType, contactId: CONTACT_ID },
    );
    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(1);
  });
});

describe("automationService.dispatch — notify_owner_email", () => {
  function setupNotifyWorkflow() {
    const workflow = makeWorkflow({
      triggerType: "lead_created",
      actionType: "notify_owner_email",
      actionConfig: { subject: "Subject", message: "Hi {{contactName}}" },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    return workflow;
  }

  it("creates the in-app notification even when no owner can be resolved (regression test)", async () => {
    setupNotifyWorkflow();
    vi.mocked(membershipRepository.findOwnerUserId).mockResolvedValue(null);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, type: "automation", title: "Subject" }),
    );
    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("creates the in-app notification even when the email send throws", async () => {
    setupNotifyWorkflow();
    vi.mocked(membershipRepository.findOwnerUserId).mockResolvedValue("user-1");
    vi.mocked(userRepository.findById).mockResolvedValue({ id: "user-1", email: "owner@example.com" } as never);
    vi.mocked(emailService.sendNotificationEmail).mockRejectedValue(new Error("Resend sandboxed"));

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("substitutes {{contactName}} in the notification message", async () => {
    setupNotifyWorkflow();
    vi.mocked(membershipRepository.findOwnerUserId).mockResolvedValue(null);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Hi Jane Customer" }),
    );
  });
});

describe("automationService.dispatch — tag actions", () => {
  it("calls contactRepository.addTag for add_contact_tag", async () => {
    const workflow = makeWorkflow({ actionType: "add_contact_tag", actionConfig: { tag: "VIP" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(contactRepository.addTag).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, "VIP");
    expect(contactRepository.removeTag).not.toHaveBeenCalled();
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: CONTACT_ID, type: "contact_tagged", actor: { type: "automation" } }),
    );
  });

  it("calls contactRepository.removeTag for remove_contact_tag", async () => {
    const workflow = makeWorkflow({ actionType: "remove_contact_tag", actionConfig: { tag: "Cold" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(contactRepository.removeTag).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, "Cold");
  });
});

describe("automationService.dispatch — create_task", () => {
  it("creates a task with the configured title/priority/due date and logs activity", async () => {
    const workflow = makeWorkflow({
      actionType: "create_task",
      actionConfig: { taskTitle: "Call back", taskPriority: "high", taskDueInDays: 2 },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        contactId: CONTACT_ID,
        title: "Call back",
        priority: "high",
        dueAt: expect.any(Date),
        createdByUserId: null,
      }),
    );
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ type: "task_created" }));
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("fails when no task title is configured", async () => {
    const workflow = makeWorkflow({ actionType: "create_task", actionConfig: {} });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(taskRepository.create).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("automationService.dispatch — create_note", () => {
  it("creates a note with {{contactName}} substituted", async () => {
    const workflow = makeWorkflow({
      actionType: "create_note",
      actionConfig: { noteContent: "Reach out to {{contactName}}" },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(noteRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        contactId: CONTACT_ID,
        content: "Reach out to Jane Customer",
        pinned: false,
        type: "ai",
        authorUserId: null,
      }),
    );
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ type: "note_added" }));
  });
});

describe("automationService.dispatch — update_contact_language", () => {
  it("sets the contact's language and logs activity", async () => {
    const workflow = makeWorkflow({ actionType: "update_contact_language", actionConfig: { contactLanguage: "ar" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(contactRepository.update).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, { language: "ar" });
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ type: "contact_updated" }));
  });

  it("fails when no language is configured", async () => {
    const workflow = makeWorkflow({ actionType: "update_contact_language", actionConfig: {} });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(contactRepository.update).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("automationService.dispatch — create_lead", () => {
  it("creates a lead when the contact has no open lead, and cascades a lead_created dispatch", async () => {
    const workflow = makeWorkflow({ triggerType: "order_created", actionType: "create_lead" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(leadRepository.findByContactId).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "order_created", contactId: CONTACT_ID });

    expect(leadRepository.create).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      contactId: CONTACT_ID,
      conversationId: null,
    });
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ type: "lead_created" }));
    // The nested lead_created dispatch re-queries findActiveByTrigger but finds no
    // order_created-only workflow matching lead_created, so only one execution is logged.
    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(1);
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("skips creating a duplicate lead when the contact already has a non-terminal lead", async () => {
    const workflow = makeWorkflow({ triggerType: "order_created", actionType: "create_lead" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(leadRepository.findByContactId).mockResolvedValue([{ id: "lead-1", stage: "qualified" } as never]);

    await automationService.dispatch(WORKSPACE_ID, { type: "order_created", contactId: CONTACT_ID });

    expect(leadRepository.create).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, summary: expect.stringContaining("already has an open lead") }),
    );
  });

  it("creates a new lead when the contact's only existing leads are all terminal (won/lost/cancelled)", async () => {
    const workflow = makeWorkflow({ triggerType: "order_created", actionType: "create_lead" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(leadRepository.findByContactId).mockResolvedValue([{ id: "lead-1", stage: "lost" } as never]);

    await automationService.dispatch(WORKSPACE_ID, { type: "order_created", contactId: CONTACT_ID });

    expect(leadRepository.create).toHaveBeenCalledTimes(1);
  });
});

describe("automationService.dispatch — close_conversation", () => {
  it("closes the contact's most recent open conversation", async () => {
    const workflow = makeWorkflow({ actionType: "close_conversation" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(conversationRepository.findByContactId).mockResolvedValue([
      { conversation: { id: "conv-1", status: "open" } } as never,
    ]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(conversationRepository.updateStatus).toHaveBeenCalledWith("conv-1", WORKSPACE_ID, "closed");
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ type: "conversation_closed" }));
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("fails when the contact has no open conversation", async () => {
    const workflow = makeWorkflow({ actionType: "close_conversation" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(conversationRepository.findByContactId).mockResolvedValue([
      { conversation: { id: "conv-1", status: "closed" } } as never,
    ]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(conversationRepository.updateStatus).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("automationService.dispatch — assign_agent", () => {
  it("assigns the contact's most recent conversation to the configured team member", async () => {
    const workflow = makeWorkflow({ actionType: "assign_agent", actionConfig: { assignedUserId: "user-1" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(conversationRepository.findByContactId).mockResolvedValue([
      { conversation: { id: "conv-1" } } as never,
      { conversation: { id: "conv-older" } } as never,
    ]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(conversationRepository.assign).toHaveBeenCalledWith("conv-1", WORKSPACE_ID, "user-1");
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ type: "conversation_assigned" }));
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, type: "assignment" }),
    );
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("fails when the assigned user is no longer a member of the workspace", async () => {
    const workflow = makeWorkflow({ actionType: "assign_agent", actionConfig: { assignedUserId: "user-1" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(membershipRepository.findByUserAndWorkspace).mockResolvedValue(null);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(conversationRepository.assign).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("fails when the contact has no conversation at all", async () => {
    const workflow = makeWorkflow({ actionType: "assign_agent", actionConfig: { assignedUserId: "user-1" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(conversationRepository.findByContactId).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(conversationRepository.assign).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("automationService.dispatch — webhook_call", () => {
  it("posts the event, workflow, and contact info to the configured URL", async () => {
    const workflow = makeWorkflow({
      actionType: "webhook_call",
      actionConfig: { webhookUrl: "https://example.com/hook", message: "Hi {{contactName}}" },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(safeWebhookPost).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({
        event: "lead_created",
        contact: expect.objectContaining({ id: CONTACT_ID, fullName: "Jane Customer" }),
        message: "Hi Jane Customer",
      }),
    );
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("fails (and is retried) when the webhook post rejects, then notifies the workspace", async () => {
    const workflow = makeWorkflow({ actionType: "webhook_call", actionConfig: { webhookUrl: "https://example.com/hook" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(safeWebhookPost).mockRejectedValue(new Error("blocked address"));

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(safeWebhookPost).toHaveBeenCalledTimes(2); // MAX_ACTION_ATTEMPTS
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, type: "webhook_failure" }),
    );
  });

  it("fails when no webhook URL is configured", async () => {
    const workflow = makeWorkflow({ actionType: "webhook_call", actionConfig: {} });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(safeWebhookPost).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("automationService.dispatch — trigger_another_workflow", () => {
  it("runs the target workflow's action for the same contact", async () => {
    const source = makeWorkflow({
      id: "workflow-source",
      actionType: "trigger_another_workflow",
      actionConfig: { targetWorkflowId: "workflow-target" },
    });
    const target = makeWorkflow({
      id: "workflow-target",
      actionType: "add_contact_tag",
      actionConfig: { tag: "Chained" },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([source]);
    vi.mocked(workflowRepository.findById).mockResolvedValue(target);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(contactRepository.addTag).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, "Chained");
    // Both the source run and the chained target run get their own execution log row.
    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(2);
  });

  it("refuses to trigger itself", async () => {
    const workflow = makeWorkflow({
      id: "workflow-1",
      actionType: "trigger_another_workflow",
      actionConfig: { targetWorkflowId: "workflow-1" },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.findById).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("breaks a two-workflow cycle instead of recursing forever", async () => {
    const a = makeWorkflow({
      id: "workflow-a",
      actionType: "trigger_another_workflow",
      actionConfig: { targetWorkflowId: "workflow-b" },
    });
    const b = makeWorkflow({
      id: "workflow-b",
      actionType: "trigger_another_workflow",
      actionConfig: { targetWorkflowId: "workflow-a" },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([a]);
    vi.mocked(workflowRepository.findById).mockResolvedValue(b);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    // a -> b succeeds; b's attempt to trigger a again is caught by the chain check and skipped,
    // not run again — so findById is only ever asked to resolve "b", never re-resolves "a".
    expect(workflowRepository.findById).toHaveBeenCalledTimes(1);
    expect(workflowRepository.findById).toHaveBeenCalledWith("workflow-b", WORKSPACE_ID);
    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(2);
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, summary: expect.stringContaining("Skipped") }),
    );
  });

  it("skips triggering a target workflow that is paused", async () => {
    const source = makeWorkflow({
      id: "workflow-source",
      actionType: "trigger_another_workflow",
      actionConfig: { targetWorkflowId: "workflow-target" },
    });
    const target = makeWorkflow({ id: "workflow-target", status: "paused" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([source]);
    vi.mocked(workflowRepository.findById).mockResolvedValue(target);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(1);
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, summary: expect.stringContaining("not active") }),
    );
  });
});

describe("automationService.dispatch — retry", () => {
  it("retries once and succeeds, recording retryCount: 1", async () => {
    const workflow = makeWorkflow({ actionType: "add_contact_tag", actionConfig: { tag: "VIP" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(contactRepository.addTag)
      .mockRejectedValueOnce(new Error("transient failure"))
      .mockResolvedValueOnce(undefined);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(contactRepository.addTag).toHaveBeenCalledTimes(2);
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, retryCount: 1 }),
    );
  });

  it("gives up after exhausting retries and records retryCount on the failure", async () => {
    const workflow = makeWorkflow({ actionType: "add_contact_tag", actionConfig: {} }); // missing tag -> always throws
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, retryCount: 1 }),
    );
  });
});

describe("automationService.dispatch — delay", () => {
  it("queues a pending run instead of executing immediately when delayDays is set", async () => {
    const workflow = makeWorkflow({ delayDays: 3 });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.createPendingRun).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, workflowId: workflow.id, contactId: CONTACT_ID }),
    );
    expect(contactRepository.addTag).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
  });

  it("runs immediately when delayDays is 0 or null", async () => {
    const workflow = makeWorkflow({ delayDays: 0 });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.createPendingRun).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(1);
  });
});

describe("automationService.dispatch — never throws", () => {
  it("swallows a repository rejection instead of throwing", async () => {
    vi.mocked(workflowRepository.findActiveByTrigger).mockRejectedValue(new Error("db down"));

    await expect(
      automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID }),
    ).resolves.toBeUndefined();
  });

  it("logs a failed execution (not a thrown error) when an action itself fails", async () => {
    const workflow = makeWorkflow({ actionType: "add_contact_tag", actionConfig: {} }); // missing tag -> throws
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errorMessage: expect.any(String) }),
    );
  });
});

describe("automationService.dispatch — webhook subscribers", () => {
  it("notifies webhook subscribers even when no workflow matches the event", async () => {
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(integrationService.notifyWebhookSubscribers).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "lead_created",
      contactId: CONTACT_ID,
    });
  });
});

describe("automationService.processDueRuns", () => {
  it("runs a due pending run for an active workflow, then clears it", async () => {
    const workflow = makeWorkflow({ actionType: "add_contact_tag", actionConfig: { tag: "Followed up" } });
    vi.mocked(workflowRepository.findDuePendingRuns).mockResolvedValue([
      {
        id: "pending-1",
        workspaceId: WORKSPACE_ID,
        workflowId: workflow.id,
        contactId: CONTACT_ID,
        eventType: "lead_created",
        eventPayload: {},
        runAfter: new Date(),
        createdAt: new Date(),
      },
    ]);
    vi.mocked(workflowRepository.findById).mockResolvedValue(workflow);

    await automationService.processDueRuns();

    expect(contactRepository.addTag).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, "Followed up");
    expect(workflowRepository.deletePendingRun).toHaveBeenCalledWith("pending-1");
  });

  it("skips running but still clears a pending run whose workflow was paused", async () => {
    const workflow = makeWorkflow({ status: "paused" });
    vi.mocked(workflowRepository.findDuePendingRuns).mockResolvedValue([
      {
        id: "pending-2",
        workspaceId: WORKSPACE_ID,
        workflowId: workflow.id,
        contactId: CONTACT_ID,
        eventType: "lead_created",
        eventPayload: {},
        runAfter: new Date(),
        createdAt: new Date(),
      },
    ]);
    vi.mocked(workflowRepository.findById).mockResolvedValue(workflow);

    await automationService.processDueRuns();

    expect(contactRepository.addTag).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
    expect(workflowRepository.deletePendingRun).toHaveBeenCalledWith("pending-2");
  });

  it("clears a pending run whose workflow was deleted", async () => {
    vi.mocked(workflowRepository.findDuePendingRuns).mockResolvedValue([
      {
        id: "pending-3",
        workspaceId: WORKSPACE_ID,
        workflowId: "deleted-workflow",
        contactId: CONTACT_ID,
        eventType: "lead_created",
        eventPayload: {},
        runAfter: new Date(),
        createdAt: new Date(),
      },
    ]);
    vi.mocked(workflowRepository.findById).mockResolvedValue(null);

    await automationService.processDueRuns();

    expect(workflowRepository.deletePendingRun).toHaveBeenCalledWith("pending-3");
  });
});

describe("automationService.dispatch — conditions", () => {
  it("does not run when a required tag is missing (matchType 'all', contact has no tags)", async () => {
    const workflow = makeWorkflow({ conditions: { matchType: "all", rules: [{ field: "tag", value: "VIP" }] } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
  });

  it("runs once the contact actually has the required tag", async () => {
    const workflow = makeWorkflow({
      actionConfig: { tag: "Followed up" },
      conditions: { matchType: "all", rules: [{ field: "tag", value: "VIP" }] },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(contactRepository.findById).mockResolvedValue({ ...CONTACT, tags: ["VIP"] });

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("matchType 'all' requires every rule — one mismatch blocks the run", async () => {
    const workflow = makeWorkflow({
      conditions: {
        matchType: "all",
        rules: [
          { field: "tag", value: "VIP" },
          { field: "language", value: "ar" },
        ],
      },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(contactRepository.findById).mockResolvedValue({ ...CONTACT, tags: ["VIP"], language: "en" });

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
  });

  it("matchType 'any' runs when at least one rule matches", async () => {
    const workflow = makeWorkflow({
      actionConfig: { tag: "Followed up" },
      conditions: {
        matchType: "any",
        rules: [
          { field: "tag", value: "VIP" },
          { field: "language", value: "ar" },
        ],
      },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(contactRepository.findById).mockResolvedValue({ ...CONTACT, tags: [], language: "ar" });

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("fails closed when conditions are set but the contact can't be found", async () => {
    const workflow = makeWorkflow({ conditions: { matchType: "all", rules: [{ field: "tag", value: "VIP" }] } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(contactRepository.findById).mockResolvedValue(null);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
  });

  it("a delayed workflow that fails its conditions at trigger time is never queued", async () => {
    const workflow = makeWorkflow({
      delayDays: 3,
      conditions: { matchType: "all", rules: [{ field: "tag", value: "VIP" }] },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.createPendingRun).not.toHaveBeenCalled();
  });

  it("lead_score condition passes once the contact's computed score meets the threshold", async () => {
    const workflow = makeWorkflow({
      actionConfig: { tag: "Hot" },
      conditions: { matchType: "all", rules: [{ field: "lead_score", value: "20" }] },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(leadRepository.findByContactId).mockResolvedValue([
      { id: "lead-1", stage: "negotiation", conversationId: null } as never,
    ]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("lead_score condition fails when the contact has no leads at all (score 0)", async () => {
    const workflow = makeWorkflow({ conditions: { matchType: "all", rules: [{ field: "lead_score", value: "10" }] } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(leadRepository.findByContactId).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
  });

  it("order_value condition passes when the contact's most recent order meets the threshold", async () => {
    const workflow = makeWorkflow({
      actionConfig: { tag: "BigSpender" },
      conditions: { matchType: "all", rules: [{ field: "order_value", value: "50" }] },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(orderRepository.findByContactId).mockResolvedValue([
      {
        order: { discountAmount: "0", taxAmount: "0", deliveryFee: "0" },
        items: [{ unitPrice: "100.00", quantity: 1 }],
      } as never,
    ]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("order_value condition fails when the contact has no orders", async () => {
    const workflow = makeWorkflow({ conditions: { matchType: "all", rules: [{ field: "order_value", value: "1" }] } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(orderRepository.findByContactId).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
  });

  it("working_hours condition passes when no working hours are configured (fail open)", async () => {
    const workflow = makeWorkflow({
      actionConfig: { tag: "OpenNow" },
      conditions: { matchType: "all", rules: [{ field: "working_hours", value: "true" }] },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(aiAgentRepository.findByWorkspaceId).mockResolvedValue(null);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe("automationService.dispatch — create_order", () => {
  it("creates an order for the configured product/quantity and cascades an order_created dispatch", async () => {
    const workflow = makeWorkflow({
      actionType: "create_order",
      actionConfig: { productId: "product-1", quantity: 2 },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([
      { id: "product-1", name: "Widget", price: "25.00" } as never,
    ]);
    vi.mocked(orderRepository.create).mockResolvedValue({ order: { id: "order-1" } } as never);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID }),
      [{ productId: "product-1", name: "Widget", unitPrice: "25.00", quantity: 2 }],
    );
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ type: "order_created" }));
    // The order_created cascade re-queries findActiveByTrigger but finds no matching workflow, so only 1 execution logs.
    expect(workflowRepository.logExecution).toHaveBeenCalledTimes(1);
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("defaults quantity to 1 when not configured or non-positive", async () => {
    const workflow = makeWorkflow({ actionType: "create_order", actionConfig: { productId: "product-1", quantity: 0 } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([
      { id: "product-1", name: "Widget", price: "25.00" } as never,
    ]);
    vi.mocked(orderRepository.create).mockResolvedValue({ order: { id: "order-1" } } as never);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(orderRepository.create).toHaveBeenCalledWith(expect.anything(), [expect.objectContaining({ quantity: 1 })]);
  });

  it("fails when no product is configured", async () => {
    const workflow = makeWorkflow({ actionType: "create_order", actionConfig: {} });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(orderRepository.create).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("fails when the configured product has no price set", async () => {
    const workflow = makeWorkflow({ actionType: "create_order", actionConfig: { productId: "product-1" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([
      { id: "product-1", name: "Widget", price: null } as never,
    ]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(orderRepository.create).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("fails when the configured product no longer exists", async () => {
    const workflow = makeWorkflow({ actionType: "create_order", actionConfig: { productId: "gone" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(orderRepository.create).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("automationService.dispatch — book_appointment", () => {
  it("books the configured service and cascades an appointment_created dispatch", async () => {
    const workflow = makeWorkflow({
      actionType: "book_appointment",
      actionConfig: { serviceId: "service-1", daysFromNow: 3 },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(serviceRepository.findByWorkspaceId).mockResolvedValue([
      { id: "service-1", name: "Consultation", durationMinutes: 45 } as never,
    ]);
    vi.mocked(appointmentRepository.create).mockResolvedValue({ id: "appointment-1" } as never);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        contactId: CONTACT_ID,
        serviceId: "service-1",
        serviceName: "Consultation",
        durationMinutes: 45,
        scheduledAt: expect.any(Date),
      }),
    );
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ type: "appointment_created" }));
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("falls back to a 30-minute duration when the service has none set", async () => {
    const workflow = makeWorkflow({ actionType: "book_appointment", actionConfig: { serviceId: "service-1" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(serviceRepository.findByWorkspaceId).mockResolvedValue([
      { id: "service-1", name: "Consultation", durationMinutes: null } as never,
    ]);
    vi.mocked(appointmentRepository.create).mockResolvedValue({ id: "appointment-1" } as never);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(appointmentRepository.create).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 30 }));
  });

  it("fails when no service is configured", async () => {
    const workflow = makeWorkflow({ actionType: "book_appointment", actionConfig: {} });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("fails when the configured service no longer exists", async () => {
    const workflow = makeWorkflow({ actionType: "book_appointment", actionConfig: { serviceId: "gone" } });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(serviceRepository.findByWorkspaceId).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(appointmentRepository.create).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("automationService.dispatch — send_ai_reply", () => {
  it("generates an AI reply, posts it, and touches the conversation", async () => {
    const workflow = makeWorkflow({ actionType: "send_ai_reply" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(conversationRepository.findByContactId).mockResolvedValue([
      { conversation: { id: "conv-1", status: "open" } } as never,
    ]);
    vi.mocked(messageRepository.findByConversationId).mockResolvedValue([
      { senderType: "customer", content: "Hi" } as never,
      { senderType: "system", content: "internal note" } as never,
    ]);
    vi.mocked(aiService.generateReply).mockResolvedValue({
      text: "Hello! How can I help?",
      stopReason: "end_turn",
      needsHumanHandover: false,
      usage: { inputTokens: 5, outputTokens: 5 },
    });

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(aiService.generateReply).toHaveBeenCalledWith(WORKSPACE_ID, [{ role: "user", content: "Hi" }]);
    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, conversationId: "conv-1", senderType: "ai", content: "Hello! How can I help?" }),
    );
    expect(conversationRepository.touchLastMessage).toHaveBeenCalledWith("conv-1", WORKSPACE_ID, "Hello! How can I help?", "ai");
    expect(conversationRepository.updateAiStatus).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("hands the conversation over to a human when the AI reply needs it", async () => {
    const workflow = makeWorkflow({ actionType: "send_ai_reply" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(conversationRepository.findByContactId).mockResolvedValue([
      { conversation: { id: "conv-1", status: "open" } } as never,
    ]);
    vi.mocked(aiService.generateReply).mockResolvedValue({
      text: "Let me get a human for you.",
      stopReason: "end_turn",
      needsHumanHandover: true,
      usage: { inputTokens: 5, outputTokens: 5 },
    });

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(conversationRepository.updateAiStatus).toHaveBeenCalledWith("conv-1", WORKSPACE_ID, "handed_over");
  });

  it("fails when the contact has no open conversation", async () => {
    const workflow = makeWorkflow({ actionType: "send_ai_reply" });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(conversationRepository.findByContactId).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(aiService.generateReply).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("automationService.dispatch — request_approval", () => {
  it("creates a pending approval and an in-app notification", async () => {
    const workflow = makeWorkflow({
      actionType: "request_approval",
      actionConfig: { message: "Please review this", targetWorkflowId: "workflow-target" },
    });
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([workflow]);
    vi.mocked(workflowApprovalRepository.create).mockResolvedValue({ id: "approval-1" } as never);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(workflowApprovalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        workflowId: workflow.id,
        contactId: CONTACT_ID,
        eventType: "lead_created",
        instructions: "Please review this",
        onApproveWorkflowId: "workflow-target",
      }),
    );
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, type: "automation" }),
    );
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe("automationService.decideApproval", () => {
  it("throws when the approval doesn't exist or was already decided", async () => {
    vi.mocked(workflowApprovalRepository.decide).mockResolvedValue(null);

    await expect(automationService.decideApproval(WORKSPACE_ID, "approval-1", "approved", "user-1")).rejects.toThrow(
      /not found|already been decided/,
    );
  });

  it("just records a rejection without running any workflow", async () => {
    vi.mocked(workflowApprovalRepository.decide).mockResolvedValue({
      id: "approval-1",
      onApproveWorkflowId: "workflow-target",
    } as never);

    await automationService.decideApproval(WORKSPACE_ID, "approval-1", "rejected", "user-1");

    expect(workflowRepository.findById).not.toHaveBeenCalled();
  });

  it("runs the linked workflow's action for the same contact/event when approved", async () => {
    vi.mocked(workflowApprovalRepository.decide).mockResolvedValue({
      id: "approval-1",
      contactId: CONTACT_ID,
      onApproveWorkflowId: "workflow-target",
      eventType: "lead_created",
      eventPayload: {},
    } as never);
    const target = makeWorkflow({ id: "workflow-target", actionType: "add_contact_tag", actionConfig: { tag: "Approved" } });
    vi.mocked(workflowRepository.findById).mockResolvedValue(target);

    await automationService.decideApproval(WORKSPACE_ID, "approval-1", "approved", "user-1");

    expect(contactRepository.addTag).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID, "Approved");
    expect(workflowRepository.logExecution).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("does not run the linked workflow if it is no longer active", async () => {
    vi.mocked(workflowApprovalRepository.decide).mockResolvedValue({
      id: "approval-1",
      contactId: CONTACT_ID,
      onApproveWorkflowId: "workflow-target",
      eventType: "lead_created",
      eventPayload: {},
    } as never);
    const target = makeWorkflow({ id: "workflow-target", status: "paused" });
    vi.mocked(workflowRepository.findById).mockResolvedValue(target);

    await automationService.decideApproval(WORKSPACE_ID, "approval-1", "approved", "user-1");

    expect(contactRepository.addTag).not.toHaveBeenCalled();
    expect(workflowRepository.logExecution).not.toHaveBeenCalled();
  });

  it("approving with no linked workflow just records the decision", async () => {
    vi.mocked(workflowApprovalRepository.decide).mockResolvedValue({
      id: "approval-1",
      contactId: CONTACT_ID,
      onApproveWorkflowId: null,
      eventType: "lead_created",
      eventPayload: {},
    } as never);

    await expect(automationService.decideApproval(WORKSPACE_ID, "approval-1", "approved", "user-1")).resolves.toBeUndefined();
    expect(workflowRepository.findById).not.toHaveBeenCalled();
  });
});

describe("automationService.dispatch — queue handoff", () => {
  it("enqueues the event and never touches workflow matching when the queue accepts it", async () => {
    vi.mocked(enqueueAutomationEvent).mockResolvedValue(true);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(enqueueAutomationEvent).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      event: { type: "lead_created", contactId: CONTACT_ID },
    });
    expect(workflowRepository.findActiveByTrigger).not.toHaveBeenCalled();
    expect(integrationService.notifyWebhookSubscribers).not.toHaveBeenCalled();
  });

  it("falls back to running the event inline when the queue rejects it (no Redis configured)", async () => {
    vi.mocked(enqueueAutomationEvent).mockResolvedValue(false);
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([]);

    await automationService.dispatch(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(integrationService.notifyWebhookSubscribers).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "lead_created",
      contactId: CONTACT_ID,
    });
    expect(workflowRepository.findActiveByTrigger).toHaveBeenCalled();
  });
});

describe("automationService.processEvent", () => {
  it("is exported directly for the worker process to call per dequeued job", async () => {
    vi.mocked(workflowRepository.findActiveByTrigger).mockResolvedValue([]);

    await automationService.processEvent(WORKSPACE_ID, { type: "lead_created", contactId: CONTACT_ID });

    expect(integrationService.notifyWebhookSubscribers).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "lead_created",
      contactId: CONTACT_ID,
    });
  });
});
