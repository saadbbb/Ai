import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewNotification, type Notification, notifications } from "@/db/schema";

export const notificationRepository = {
  async findByWorkspaceId(workspaceId: string, limit = 20): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.workspaceId, workspaceId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  },

  async countUnread(workspaceId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.workspaceId, workspaceId), eq(notifications.isRead, false)));
    return row?.count ?? 0;
  },

  async create(data: NewNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  },

  async markAsRead(id: string, workspaceId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.workspaceId, workspaceId)));
  },

  async markAllAsRead(workspaceId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.workspaceId, workspaceId), eq(notifications.isRead, false)));
  },
};
