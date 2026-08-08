import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/crm/repository/task.repository", () => ({
  taskRepository: { create: vi.fn() },
}));

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

const { taskRepository } = await import("@/features/crm/repository/task.repository");
const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { createTaskTool } = await import("./create-task.tool");

import type { ToolContext, ToolSignals } from "./types";

function makeContext(): ToolContext {
  const signals: ToolSignals = { handoverRequested: false };
  return { workspaceId: "workspace-1", contactId: "contact-1", conversationId: "conversation-1", signals };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTaskTool", () => {
  it("creates a task with no dueAt when dueInDays is omitted", async () => {
    vi.mocked(taskRepository.create).mockResolvedValue({ id: "task-1", title: "Call back next week" } as never);

    const summary = await createTaskTool.execute(makeContext(), { title: "Call back next week", priority: "medium" });

    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        contactId: "contact-1",
        title: "Call back next week",
        priority: "medium",
        dueAt: null,
      }),
    );
    expect(summary).toContain("Call back next week");
  });

  it("computes a future dueAt from dueInDays", async () => {
    vi.mocked(taskRepository.create).mockResolvedValue({ id: "task-1", title: "Check stock" } as never);
    const before = Date.now();

    await createTaskTool.execute(makeContext(), { title: "Check stock", dueInDays: 3, priority: "low" });

    const call = vi.mocked(taskRepository.create).mock.calls[0][0];
    expect(call.dueAt).toBeInstanceOf(Date);
    expect((call.dueAt as Date).getTime()).toBeGreaterThanOrEqual(before + 2 * 24 * 60 * 60 * 1000);
  });

  it("logs an AI-attributed activity with no human actor", async () => {
    vi.mocked(taskRepository.create).mockResolvedValue({ id: "task-1", title: "Follow up" } as never);

    await createTaskTool.execute(makeContext(), { title: "Follow up", priority: "medium" });

    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", contactId: "contact-1", type: "task_created", actor: { type: "ai" } }),
    );
  });

  it("rejects a blank title", () => {
    const result = createTaskTool.schema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("defaults priority to medium when omitted", () => {
    const result = createTaskTool.schema.safeParse({ title: "Follow up" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("medium");
    }
  });
});
