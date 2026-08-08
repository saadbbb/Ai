import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Task } from "@/db/schema";

vi.mock("../repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("../repository/task.repository", () => ({
  taskRepository: { create: vi.fn(), complete: vi.fn(), delete: vi.fn(), findByContactId: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findById: vi.fn() },
}));

const { activityRepository } = await import("../repository/activity.repository");
const { taskRepository } = await import("../repository/task.repository");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { taskService } = await import("./task.service");

const WORKSPACE_ID = "workspace-1";
const CONTACT_ID = "contact-1";
const USER_ID = "user-1";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
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
    marketingOptOut: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    workspaceId: WORKSPACE_ID,
    contactId: CONTACT_ID,
    title: "Follow up",
    dueAt: null,
    priority: "medium",
    status: "open",
    assignedToUserId: null,
    createdByUserId: USER_ID,
    reminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("taskService.createTask", () => {
  it("creates a task and logs it as a human-attributed activity", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact());
    vi.mocked(taskRepository.create).mockResolvedValue(makeTask());

    const task = await taskService.createTask(WORKSPACE_ID, USER_ID, {
      contactId: CONTACT_ID,
      title: "Follow up",
      priority: "medium",
    });

    expect(task.title).toBe("Follow up");
    expect(contactRepository.findById).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID);
    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID, createdByUserId: USER_ID }),
    );
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: CONTACT_ID, type: "task_created", actor: { type: "human", userId: USER_ID } }),
    );
  });

  it("rejects a contactId that doesn't belong to this workspace (cross-tenant IDOR guard)", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(null);

    await expect(
      taskService.createTask(WORKSPACE_ID, USER_ID, {
        contactId: "someone-elses-contact",
        title: "Follow up",
        priority: "medium",
      }),
    ).rejects.toThrow("Contact not found.");
    expect(taskRepository.create).not.toHaveBeenCalled();
    expect(activityRepository.log).not.toHaveBeenCalled();
  });
});

describe("taskService.completeTask", () => {
  it("throws NOT_FOUND when the task doesn't exist in this workspace", async () => {
    vi.mocked(taskRepository.complete).mockResolvedValue(null);

    await expect(taskService.completeTask(WORKSPACE_ID, USER_ID, "missing-task")).rejects.toThrow("Task not found.");
    expect(activityRepository.log).not.toHaveBeenCalled();
  });

  it("logs a task_completed activity when the task has a contact", async () => {
    vi.mocked(taskRepository.complete).mockResolvedValue(makeTask({ status: "done" }));

    await taskService.completeTask(WORKSPACE_ID, USER_ID, "task-1");

    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: CONTACT_ID, type: "task_completed" }),
    );
  });

  it("skips activity logging for a contact-less task", async () => {
    vi.mocked(taskRepository.complete).mockResolvedValue(makeTask({ status: "done", contactId: null }));

    await taskService.completeTask(WORKSPACE_ID, USER_ID, "task-1");

    expect(activityRepository.log).not.toHaveBeenCalled();
  });
});
