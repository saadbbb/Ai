"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Channel, Contact, Conversation, ConversationAiStatus, Message, MessageSenderType } from "@/db/schema";
import { cn } from "@/lib/utils";
import { getConversationAction } from "../actions/get-conversation.action";
import { logCustomerMessageAction } from "../actions/log-customer-message.action";
import { closeConversationAction, pauseAiAction, resumeAiAction } from "../actions/set-ai-status.action";
import { sendAgentReplyAction } from "../actions/send-agent-reply.action";
import { AiStatusBadge } from "./ai-status-badge";

const POLL_INTERVAL_MS = 4000;

interface ConversationThreadProps {
  conversation: Conversation;
  contact: Contact;
  channel: Channel;
  initialMessages: Message[];
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

export function ConversationThread({ conversation, contact, channel, initialMessages }: ConversationThreadProps) {
  const t = useTranslations("inbox.thread");
  const [messages, setMessages] = useState(initialMessages);
  const [aiStatus, setAiStatus] = useState<ConversationAiStatus>(conversation.aiStatus);
  const [status, setStatus] = useState(conversation.status);
  const [content, setContent] = useState("");
  const [logMode, setLogMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTogglingAi, setIsTogglingAi] = useState(false);
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

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    const result = logMode
      ? await logCustomerMessageAction({ conversationId: conversation.id, content: trimmed })
      : await sendAgentReplyAction({ conversationId: conversation.id, content: trimmed });
    setIsSending(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setMessages((current) => [...current, ...(Array.isArray(result.data) ? result.data : [result.data])]);
    setContent("");
    if (!logMode && aiStatus === "active") {
      setAiStatus("paused");
    }
  }

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

  return (
    <div className="flex h-[75vh] flex-col rounded-lg border">
      <div className="flex items-center justify-between gap-4 border-b p-4">
        <div>
          <p className="font-medium">{contact.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {[contact.phone, t(`channel.${channel.type}`)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AiStatusBadge status={aiStatus} />
          {status === "open" ? (
            <>
              <Button type="button" variant="outline" size="sm" disabled={isTogglingAi} onClick={handleToggleAi}>
                {aiStatus === "active" ? t("pauseAi") : t("resumeAi")}
              </Button>
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
              <p className="mb-1 text-xs font-medium opacity-70">{senderLabel[message.senderType]}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="mt-1 text-right text-[10px] opacity-60">{formatTime(new Date(message.createdAt))}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {status === "open" && (
        <div className="space-y-2 border-t p-3">
          <button
            type="button"
            onClick={() => setLogMode((current) => !current)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {logMode ? t("switchToReply") : t("logCustomerMessage")}
          </button>
          <div className="flex items-end gap-2">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={logMode ? t("logCustomerPlaceholder") : t("replyPlaceholder")}
              rows={2}
              className="flex-1"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button type="button" onClick={handleSend} disabled={isSending}>
              {isSending ? t("sending") : logMode ? t("logSubmit") : t("sendReply")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
