import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Workflow } from "@/db/schema";

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
const { emailService } = await import("@/lib/email");
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
  lastContactAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(contactRepository.findById).mockResolvedValue(CONTACT);
  vi.mocked(workflowRepository.logExecution).mockResolvedValue({} as never);
  vi.mocked(taskRepository.create).mockResolvedValue({ id: "task-1", title: "Follow up" } as never);
  vi.mocked(noteRepository.create).mockResolvedValue({ id: "note-1" } as never);
  vi.mocked(contactRepository.update).mockResolvedValue(CONTACT);
  vi.mocked(leadRepository.findByContactId).mockResolvedValue([]);
  vi.mocked(leadRepository.create).mockResolvedValue({ id: "lead-1", contactId: CONTACT_ID, stage: "new" } as never);
  vi.mocked(conversationRepository.findByContactId).mockResolvedValue([]);
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
});
