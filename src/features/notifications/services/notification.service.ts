import "server-only";
import type { Notification } from "@/db/schema";
import { notificationRepository } from "../repository/notification.repository";

async function getForWorkspace(workspaceId: string): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.findByWorkspaceId(workspaceId),
    notificationRepository.countUnread(workspaceId),
  ]);
  return { notifications, unreadCount };
}

async function markAsRead(workspaceId: string, id: string): Promise<void> {
  await notificationRepository.markAsRead(id, workspaceId);
}

async function markAllAsRead(workspaceId: string): Promise<void> {
  await notificationRepository.markAllAsRead(workspaceId);
}

export const notificationService = {
  getForWorkspace,
  markAsRead,
  markAllAsRead,
};
