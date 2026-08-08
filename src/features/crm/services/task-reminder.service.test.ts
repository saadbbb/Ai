import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Task } from "@/db/schema";

vi.mock("../repository/task.repository", () => ({
  taskRepository: { findDueForReminder: vi.fn(), markReminderSent: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findById: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

const { taskRepository } = await import("../repository/task.repository");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { taskReminderService } = await import("./task-reminder.service");

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    workspaceId: "workspace-1",
    contactId: "contact-1",
    title: "Call back with a quote",
    dueAt: new Date("2026-01-01T00:00:00Z"),
    priority: "medium",
    status: "open",
    assignedToUserId: null,
    createdByUserId: null,
    reminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    workspaceId: "workspace-1",
    fullName: "Ahmed",
    phone: null,
    whatsappId: null,
    instagramId: null,
    email: null,
    language: "en",
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("taskReminderService.runDailyCheck", () => {
  it("notifies and marks each due task returned by the repository, including the contact's name", async () => {
    vi.mocked(taskRepository.findDueForReminder).mockResolvedValue([makeTask()]);
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact());

    const result = await taskReminderService.runDailyCheck();

    expect(result.reminded).toBe(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        type: "task_reminder",
        link: "/dashboard/contacts/contact-1",
        message: expect.stringContaining("Ahmed"),
      }),
    );
    expect(taskRepository.markReminderSent).toHaveBeenCalledWith("task-1");
  });

  it("falls back to a dashboard link when the task has no contact", async () => {
    vi.mocked(taskRepository.findDueForReminder).mockResolvedValue([makeTask({ contactId: null })]);

    const result = await taskReminderService.runDailyCheck();

    expect(result.reminded).toBe(1);
    expect(contactRepository.findById).not.toHaveBeenCalled();
    expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({ link: "/dashboard" }));
  });

  it("continues past a single task's failure without throwing", async () => {
    vi.mocked(taskRepository.findDueForReminder).mockResolvedValue([
      makeTask({ id: "task-1", contactId: null }),
      makeTask({ id: "task-2", contactId: null }),
    ]);
    vi.mocked(notificationRepository.create)
      .mockRejectedValueOnce(new Error("db down"))
      // @ts-expect-error only the call succeeding matters for this test, not the return shape
      .mockResolvedValueOnce(undefined);

    const result = await taskReminderService.runDailyCheck();

    expect(result.reminded).toBe(1);
    expect(taskRepository.markReminderSent).toHaveBeenCalledTimes(1);
    expect(taskRepository.markReminderSent).toHaveBeenCalledWith("task-2");
  });

  it("returns zero reminded when nothing is due", async () => {
    vi.mocked(taskRepository.findDueForReminder).mockResolvedValue([]);

    const result = await taskReminderService.runDailyCheck();

    expect(result.reminded).toBe(0);
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});
