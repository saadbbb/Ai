"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Notification } from "@/db/schema";
import { markAllNotificationsReadAction } from "../actions/mark-all-notifications-read.action";
import { markNotificationReadAction } from "../actions/mark-notification-read.action";

function formatRelative(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}) {
  const t = useTranslations("notifications");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isOpen, setIsOpen] = useState(false);

  async function handleItemClick(notification: Notification) {
    if (!notification.isRead) {
      setNotifications((current) => current.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      setUnreadCount((current) => Math.max(0, current - 1));
      await markNotificationReadAction({ id: notification.id });
    }
    setIsOpen(false);
  }

  async function handleMarkAllRead() {
    setNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          aria-label={t("bellLabel")}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-0 p-2"
      >
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sm font-medium">{t("title")}</span>
          {unreadCount > 0 && (
            <Button type="button" variant="ghost" size="xs" onClick={handleMarkAllRead}>
              {t("markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="p-3 text-center text-sm text-muted-foreground">{t("empty")}</p>
          )}
          {notifications.map((notification) => {
            const content = (
              <div className={notification.isRead ? "opacity-60" : ""}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(new Date(notification.createdAt))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{notification.message}</p>
              </div>
            );

            return notification.link ? (
              <Link
                key={notification.id}
                href={notification.link}
                onClick={() => handleItemClick(notification)}
                className="block rounded-md p-2 hover:bg-muted"
              >
                {content}
              </Link>
            ) : (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleItemClick(notification)}
                className="block w-full rounded-md p-2 text-start hover:bg-muted"
              >
                {content}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
