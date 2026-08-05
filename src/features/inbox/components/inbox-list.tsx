"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AiStatusBadge } from "./ai-status-badge";
import { listConversationsAction } from "../actions/list-conversations.action";
import type { ConversationListItem } from "../repository/conversation.repository";

const POLL_INTERVAL_MS = 5000;

const CHANNEL_LABEL_KEY = {
  manual: "channelManual",
  whatsapp: "channelWhatsapp",
  instagram: "channelInstagram",
} as const;

export function InboxList({ initialConversations }: { initialConversations: ConversationListItem[] }) {
  const t = useTranslations("inbox.list");
  const [conversations, setConversations] = useState(initialConversations);

  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await listConversationsAction();
      if (result.success) {
        setConversations(result.data);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  if (conversations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {t("emptyState")}
      </p>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {conversations.map(({ conversation, contact, channel }) => (
        <Link
          key={conversation.id}
          href={`/dashboard/inbox/${conversation.id}`}
          className="flex items-center justify-between gap-4 p-4 hover:bg-muted"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{contact.fullName}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{t(CHANNEL_LABEL_KEY[channel.type])}</span>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {conversation.lastMessagePreview ?? t("noMessages")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {conversation.status === "closed" && (
              <span className="text-xs text-muted-foreground">{t("closedBadge")}</span>
            )}
            <AiStatusBadge status={conversation.aiStatus} />
          </div>
        </Link>
      ))}
    </div>
  );
}
