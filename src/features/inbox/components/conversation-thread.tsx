"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Channel, Contact, Conversation, ConversationAiStatus, Message, MessageSenderType, MessageTemplate } from "@/db/schema";
import { TagManager } from "@/features/crm/components/tag-manager";
import { cn } from "@/lib/utils";
import { getConversationAction } from "../actions/get-conversation.action";
import { handToHumanAction } from "../actions/hand-to-human.action";
import { closeConversationAction, pauseAiAction, resumeAiAction } from "../actions/set-ai-status.action";
import { AiStatusBadge } from "./ai-status-badge";
import { AssignedAgentSelect } from "./assigned-agent-select";
import { ContactAvatar } from "./contact-avatar";
import { MessageComposer } from "./message-composer";

const POLL_INTERVAL_MS = 4000;

interface ConversationThreadProps {
  conversation: Conversation;
  contact: Contact;
  channel: Channel;
  initialMessages: Message[];
  members: { id: string; email: string }[];
  initialTemplates: MessageTemplate[];
}

const SENDER_ALIGNMENT: Record<MessageSenderType, string> = {
  customer: "justify-start",
  ai: "justify-end",
  agent: "justify-end",
  system: "justify-center",
};

const SENDER_BUBBLE: Record<MessageSenderType, string> = {
  customer: "bg-muted",
  ai: "bg-primary/10",
  agent: "bg-primary text-primary-foreground",
  system: "bg-transparent text-muted-foreground italic",
};

function formatTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function ConversationThread({
  conversation,
  contact,
  channel,
  initialMessages,
  members,
  initialTemplates,
}: ConversationThreadProps) {
  const t = useTranslations("inbox.thread");
  const [messages, setMessages] = useState(initialMessages);
  const [aiStatus, setAiStatus] = useState<ConversationAiStatus>(conversation.aiStatus);
  const [status, setStatus] = useState(conversation.status);
  const [isTogglingAi, setIsTogglingAi] = useState(false);
  const [isHandingToHuman, setIsHandingToHuman] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "open") return;

    const interval = setInterval(async () => {
      const result = await getConversationAction({ conversationId: conversation.id });
      if (result.success && result.data) {
        setMessages(result.data.messages);
        setAiStatus(result.data.conversation.aiStatus);
        setStatus(result.data.conversation.status);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [conversation.id, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const senderLabel: Record<MessageSenderType, string> = {
    customer: contact.fullName,
    ai: t("senderAi"),
    agent: t("senderYou"),
    system: t("senderSystem"),
  };

  async function handleToggleAi() {
    setIsTogglingAi(true);
    const result = aiStatus === "active" ? await pauseAiAction({ conversationId: conversation.id }) : await resumeAiAction({ conversationId: conversation.id });
    setIsTogglingAi(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAiStatus(aiStatus === "active" ? "paused" : "active");
  }

  async function handleClose() {
    const result = await closeConversationAction({ conversationId: conversation.id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setStatus("closed");
  }

  async function handleHandToHuman() {
    setIsHandingToHuman(true);
    const result = await handToHumanAction({ conversationId: conversation.id });
    setIsHandingToHuman(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setAiStatus("handed_over");
  }

  return (
    <div className="flex h-full flex-col rounded-lg border">
      <div className="flex items-center justify-between gap-4 border-b p-4">
        <div className="flex min-w-0 items-center gap-3">
          <ContactAvatar fullName={contact.fullName} avatarUrl={contact.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium">{contact.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[contact.phone, t(`channel.${channel.type}`)].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <AssignedAgentSelect
                conversationId={conversation.id}
                initialAssignedUserId={conversation.assignedUserId}
                members={members}
              />
              <TagManager contactId={contact.id} initialTags={contact.tags} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AiStatusBadge status={aiStatus} />
          {status === "open" ? (
            <>
              <Button type="button" variant="outline" size="sm" disabled={isTogglingAi} onClick={handleToggleAi}>
                {aiStatus === "active" ? t("pauseAi") : t("resumeAi")}
              </Button>
              {aiStatus !== "handed_over" && (
                <Button type="button" variant="outline" size="sm" disabled={isHandingToHuman} onClick={handleHandToHuman}>
                  {t("handToHuman")}
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                {t("closeConversation")}
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">{t("closedBadge")}</span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", SENDER_ALIGNMENT[message.senderType])}>
            <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", SENDER_BUBBLE[message.senderType])}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-medium opacity-70">{senderLabel[message.senderType]}</p>
                {message.detectedIntent && message.detectedIntent !== "other" && (
                  <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] opacity-70 dark:bg-white/10">
                    {t(`intents.${message.detectedIntent}`)}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="mt-1 text-right text-[10px] opacity-60">{formatTime(new Date(message.createdAt))}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {status === "open" && (
        <MessageComposer
          conversationId={conversation.id}
          contactId={contact.id}
          aiStatus={aiStatus}
          initialTemplates={initialTemplates}
          onMessagesSent={(sent) => setMessages((current) => [...current, ...sent])}
          onAgentReplied={() => {
            if (aiStatus === "active") setAiStatus("paused");
          }}
        />
      )}
    </div>
  );
}
