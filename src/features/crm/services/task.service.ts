import "server-only";
import type { Task, TaskPriority } from "@/db/schema";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { AppError } from "@/lib/errors/app-error";
import { activityRepository } from "../repository/activity.repository";
import { taskRepository } from "../repository/task.repository";

interface CreateTaskInput {
  contactId: string;
  title: string;
  dueAt?: Date;
  priority: TaskPriority;
}

async function listTasksForContact(workspaceId: string, contactId: string): Promise<Task[]> {
  return taskRepository.findByContactId(contactId, workspaceId);
}

async function createTask(workspaceId: string, userId: string, input: CreateTaskInput): Promise<Task> {
  const contact = await contactRepository.findById(input.contactId, workspaceId);
  if (!contact) {
    throw new AppError("NOT_FOUND", "Contact not found.");
  }

  const task = await taskRepository.create({
    workspaceId,
    contactId: input.contactId,
    title: input.title,
    dueAt: input.dueAt ?? null,
    priority: input.priority,
    createdByUserId: userId,
  });

  await activityRepository.log({
    workspaceId,
    contactId: input.contactId,
    type: "task_created",
    actor: { type: "human", userId },
    summary: `Task created: "${task.title}"`,
  });

  return task;
}

async function completeTask(workspaceId: string, userId: string, taskId: string): Promise<Task> {
  const task = await taskRepository.complete(taskId, workspaceId);
  if (!task) {
    throw new AppError("NOT_FOUND", "Task not found.");
  }

  if (task.contactId) {
    await activityRepository.log({
      workspaceId,
      contactId: task.contactId,
      type: "task_completed",
      actor: { type: "human", userId },
      summary: `Task completed: "${task.title}"`,
    });
  }

  return task;
}

async function deleteTask(workspaceId: string, taskId: string): Promise<void> {
  await taskRepository.delete(taskId, workspaceId);
}

export const taskService = {
  listTasksForContact,
  createTask,
  completeTask,
  deleteTask,
};
