"use client";

import { Archive, ArchiveRestore, Flag, Inbox as InboxIcon, Pin, PinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AiStatusBadge } from "./ai-status-badge";
import { listConversationsAction } from "../actions/list-conversations.action";
import { reopenConversationAction, closeConversationAction } from "../actions/set-ai-status.action";
import { setPinnedAction } from "../actions/set-pinned.action";
import { setPriorityAction } from "../actions/set-priority.action";
import type { ConversationFilters, ConversationListItem } from "../repository/conversation.repository";

const POLL_INTERVAL_MS = 5000;

const CHANNEL_LABEL_KEY = {
  manual: "channelManual",
  whatsapp: "channelWhatsapp",
  instagram: "channelInstagram",
} as const;

type QuickFilter = "pinned" | "priority" | "unassigned" | "needsReply" | "archived";

const QUICK_FILTERS: QuickFilter[] = ["pinned", "priority", "unassigned", "needsReply", "archived"];

function toRepositoryFilters(search: string, active: Set<QuickFilter>): ConversationFilters {
  return {
    search: search.trim() || undefined,
    pinned: active.has("pinned") ? true : undefined,
    priority: active.has("priority") ? "high" : undefined,
    unassigned: active.has("unassigned") ? true : undefined,
    needsReply: active.has("needsReply") ? true : undefined,
    status: active.has("archived") ? "closed" : "open",
  };
}

export function InboxList({
  initialConversations,
  selectedId,
}: {
  initialConversations: ConversationListItem[];
  selectedId?: string;
}) {
  const t = useTranslations("inbox.list");
  const [conversations, setConversations] = useState(initialConversations);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<QuickFilter>>(new Set());
  const filtersRef = useRef(toRepositoryFilters(search, activeFilters));
  filtersRef.current = toRepositoryFilters(search, activeFilters);

  async function refresh() {
    const result = await listConversationsAction(filtersRef.current);
    if (result.success) {
      setConversations(result.data);
    }
  }

  useEffect(() => {
    refresh();
  }, [search, activeFilters]);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  function toggleFilter(filter: QuickFilter) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  async function handleTogglePin(conversationId: string, pinned: boolean) {
    setConversations((current) =>
      current.map((item) =>
        item.conversation.id === conversationId ? { ...item, conversation: { ...item.conversation, pinned } } : item,
      ),
    );
    const result = await setPinnedAction({ conversationId, pinned });
    if (!result.success) {
      toast.error(result.error.message);
      refresh();
    }
  }

  async function handleTogglePriority(conversationId: string, isHigh: boolean) {
    const priority: "normal" | "high" = isHigh ? "high" : "normal";
    setConversations((current) =>
      current.map((item) =>
        item.conversation.id === conversationId ? { ...item, conversation: { ...item.conversation, priority } } : item,
      ),
    );
    const result = await setPriorityAction({ conversationId, priority });
    if (!result.success) {
      toast.error(result.error.message);
      refresh();
    }
  }

  async function handleToggleArchive(conversationId: string, archive: boolean) {
    const result = archive
      ? await closeConversationAction({ conversationId })
      : await reopenConversationAction({ conversationId });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-background py-1">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-48 flex-1"
        />
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => toggleFilter(filter)}
            aria-pressed={activeFilters.has(filter)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
              activeFilters.has(filter)
                ? "border-primary bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t(`filters.${filter}`)}
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <EmptyState icon={InboxIcon} title={t("emptyState")} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {conversations.map(({ conversation, contact, channel }) => (
            <div
              key={conversation.id}
              aria-current={conversation.id === selectedId ? "true" : undefined}
              className={cn(
                "flex items-center justify-between gap-4 border-s-2 p-4 hover:bg-muted",
                conversation.id === selectedId ? "border-s-primary bg-primary-soft" : "border-s-transparent",
              )}
            >
              <Link href={`/dashboard/inbox/${conversation.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {conversation.pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
                  <p className="truncate font-medium">{contact.fullName}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{t(CHANNEL_LABEL_KEY[channel.type])}</span>
                  {conversation.priority === "high" && (
                    <Badge variant="destructive" className="shrink-0">
                      {t("filters.priority")}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {conversation.lastMessagePreview ?? t("noMessages")}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {conversation.status === "closed" && (
                  <span className="text-xs text-muted-foreground">{t("closedBadge")}</span>
                )}
                <AiStatusBadge status={conversation.aiStatus} />
                <button
                  type="button"
                  onClick={() => handleTogglePin(conversation.id, !conversation.pinned)}
                  aria-label={conversation.pinned ? t("unpin") : t("pin")}
                  title={conversation.pinned ? t("unpin") : t("pin")}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {conversation.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePriority(conversation.id, conversation.priority !== "high")}
                  aria-label={conversation.priority === "high" ? t("unmarkPriority") : t("markPriority")}
                  title={conversation.priority === "high" ? t("unmarkPriority") : t("markPriority")}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md hover:bg-muted",
                    conversation.priority === "high" ? "text-destructive" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Flag className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleArchive(conversation.id, conversation.status !== "closed")}
                  aria-label={conversation.status === "closed" ? t("reopen") : t("archive")}
                  title={conversation.status === "closed" ? t("reopen") : t("archive")}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {conversation.status === "closed" ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
