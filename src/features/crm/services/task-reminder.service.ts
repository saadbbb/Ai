import "server-only";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { taskRepository } from "../repository/task.repository";

const RENOTIFY_AFTER_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TaskReminderResult {
  reminded: number;
}

/**
 * Runs once a day via /api/cron/task-reminders (see vercel.json) — nudges the
 * workspace about open tasks that are due today or overdue. Unlike appointment
 * reminders (one-shot), this re-notifies every few days for as long as a task
 * stays open and overdue, since an ignored task warrants repeated nagging.
 * Never throws for a single task's failure, same pattern as the other daily crons.
 */
async function runDailyCheck(): Promise<TaskReminderResult> {
  const dueBefore = new Date();
  const renotifyBefore = new Date(Date.now() - RENOTIFY_AFTER_DAYS * DAY_MS);
  const due = await taskRepository.findDueForReminder(dueBefore, renotifyBefore);

  let reminded = 0;
  for (const task of due) {
    try {
      const contact = task.contactId ? await contactRepository.findById(task.contactId, task.workspaceId) : null;
      const suffix = contact ? ` for ${contact.fullName}` : "";

      await notificationRepository.create({
        workspaceId: task.workspaceId,
        type: "task_reminder",
        title: `Task due: ${task.title}`,
        message: `The task "${task.title}"${suffix} is due or overdue and still open.`,
        link: contact ? `/dashboard/contacts/${contact.id}` : `/dashboard`,
      });
      await taskRepository.markReminderSent(task.id);
      reminded += 1;
    } catch (error) {
      console.error(`[task-reminders] failed for task ${task.id}:`, error);
    }
  }

  return { reminded };
}

export const taskReminderService = {
  runDailyCheck,
};
