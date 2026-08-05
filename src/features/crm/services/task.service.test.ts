import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/db/schema";

vi.mock("../repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("../repository/task.repository", () => ({
  taskRepository: { create: vi.fn(), complete: vi.fn(), delete: vi.fn(), findByContactId: vi.fn() },
}));

const { activityRepository } = await import("../repository/activity.repository");
const { taskRepository } = await import("../repository/task.repository");
const { taskService } = await import("./task.service");

const WORKSPACE_ID = "workspace-1";
const CONTACT_ID = "contact-1";
const USER_ID = "user-1";

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
    vi.mocked(taskRepository.create).mockResolvedValue(makeTask());

    const task = await taskService.createTask(WORKSPACE_ID, USER_ID, {
      contactId: CONTACT_ID,
      title: "Follow up",
      priority: "medium",
    });

    expect(task.title).toBe("Follow up");
    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, contactId: CONTACT_ID, createdByUserId: USER_ID }),
    );
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: CONTACT_ID, type: "task_created", actor: { type: "human", userId: USER_ID } }),
    );
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
