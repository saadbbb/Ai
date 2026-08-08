"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

export function InboxList({ initialConversations }: { initialConversations: ConversationListItem[] }) {
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
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-8 min-w-48 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none focus:border-foreground"
        />
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => toggleFilter(filter)}
            aria-pressed={activeFilters.has(filter)}
            className={`h-8 shrink-0 rounded-full border px-3 text-xs font-medium ${
              activeFilters.has(filter) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            {t(`filters.${filter}`)}
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {conversations.map(({ conversation, contact, channel }) => (
            <div key={conversation.id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted">
              <Link href={`/dashboard/inbox/${conversation.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {conversation.pinned && <span className="text-xs text-primary">{t("pinnedMarker")}</span>}
                  <p className="truncate font-medium">{contact.fullName}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{t(CHANNEL_LABEL_KEY[channel.type])}</span>
                  {conversation.priority === "high" && (
                    <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                      {t("filters.priority")}
                    </span>
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
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {conversation.pinned ? t("unpin") : t("pin")}
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePriority(conversation.id, conversation.priority !== "high")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {conversation.priority === "high" ? t("unmarkPriority") : t("markPriority")}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleArchive(conversation.id, conversation.status !== "closed")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {conversation.status === "closed" ? t("reopen") : t("archive")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
