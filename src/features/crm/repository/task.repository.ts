import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewTask, type Task, tasks } from "@/db/schema";

export const taskRepository = {
  async findByContactId(contactId: string, workspaceId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.contactId, contactId), eq(tasks.workspaceId, workspaceId)))
      .orderBy(asc(tasks.status), asc(tasks.dueAt));
  },

  /** Open tasks assigned to a specific team member — feeds the Agent Home dashboard's "My Work" band. */
  async findOpenByAssignedUser(workspaceId: string, userId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.assignedToUserId, userId), eq(tasks.status, "open")))
      .orderBy(asc(tasks.dueAt));
  },

  async findById(id: string, workspaceId: string): Promise<Task | null> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    return task ?? null;
  },

  async create(data: NewTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(data).returning();
    return task;
  },

  async complete(id: string, workspaceId: string): Promise<Task | null> {
    const [task] = await db
      .update(tasks)
      .set({ status: "done", updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .returning();
    return task ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)));
  },

  /** Open tasks due today or earlier, not reminded yet or last reminded before `renotifyBefore` — feeds the daily task-reminders cron. */
  async findDueForReminder(dueBefore: Date, renotifyBefore: Date): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.status, "open"),
          lte(tasks.dueAt, dueBefore),
          or(isNull(tasks.reminderSentAt), lte(tasks.reminderSentAt, renotifyBefore)),
        ),
      )
      .orderBy(asc(tasks.dueAt));
  },

  async markReminderSent(id: string): Promise<void> {
    await db.update(tasks).set({ reminderSentAt: new Date() }).where(eq(tasks.id, id));
  },
};
