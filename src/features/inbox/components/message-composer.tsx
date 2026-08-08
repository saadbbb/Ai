"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import type { ConversationAiStatus, Message, MessageTemplate } from "@/db/schema";
import { createNoteAction } from "@/features/crm/actions/create-note.action";
import { deleteTemplateAction } from "../actions/delete-template.action";
import { logCustomerMessageAction } from "../actions/log-customer-message.action";
import { saveTemplateAction } from "../actions/save-template.action";
import { sendAgentReplyAction } from "../actions/send-agent-reply.action";
import { suggestReplyAction } from "../actions/suggest-reply.action";

const EMOJI_PALETTE = ["🙂", "👍", "🙏", "❤️", "🎉", "😅", "😊", "👋"];

type ComposerMode = "reply" | "log" | "note";

export function MessageComposer({
  conversationId,
  contactId,
  aiStatus,
  initialTemplates,
  onMessagesSent,
  onAgentReplied,
}: {
  conversationId: string;
  contactId: string;
  aiStatus: ConversationAiStatus;
  initialTemplates: MessageTemplate[];
  onMessagesSent: (messages: Message[]) => void;
  onAgentReplied: () => void;
}) {
  const t = useTranslations("inbox.thread");
  const [mode, setMode] = useState<ComposerMode>("reply");
  const [content, setContent] = useState("");
  const [templates, setTemplates] = useState(initialTemplates);
  const [isSending, setIsSending] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);

  const placeholderKey = mode === "log" ? "logCustomerPlaceholder" : mode === "note" ? "notePlaceholder" : "replyPlaceholder";

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    if (mode === "note") {
      const result = await createNoteAction({ contactId, content: trimmed, pinned: false, type: "team" });
      setIsSending(false);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(t("noteSaved"));
      setContent("");
      return;
    }

    const result =
      mode === "log"
        ? await logCustomerMessageAction({ conversationId, content: trimmed })
        : await sendAgentReplyAction({ conversationId, content: trimmed });
    setIsSending(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    onMessagesSent(Array.isArray(result.data) ? result.data : [result.data]);
    setContent("");
    if (mode === "reply") {
      onAgentReplied();
    }
  }

  async function handleSuggest() {
    setIsSuggesting(true);
    const result = await suggestReplyAction({ conversationId });
    setIsSuggesting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setContent(result.data);
  }

  async function handleSaveTemplate() {
    const name = newTemplateName.trim();
    if (!name || !content.trim()) return;

    const result = await saveTemplateAction({ name, content: content.trim() });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setTemplates((current) => [...current, result.data]);
    setNewTemplateName("");
    setShowNewTemplateForm(false);
  }

  async function handleDeleteTemplate(templateId: string) {
    setTemplates((current) => current.filter((template) => template.id !== templateId));
    await deleteTemplateAction({ templateId });
  }

  return (
    <div className="space-y-2 border-t p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setMode("reply")}
            className={mode === "reply" ? "font-medium text-foreground" : "text-muted-foreground hover:underline"}
          >
            {t("modeReply")}
          </button>
          <button
            type="button"
            onClick={() => setMode("log")}
            className={mode === "log" ? "font-medium text-foreground" : "text-muted-foreground hover:underline"}
          >
            {t("modeLog")}
          </button>
          <button
            type="button"
            onClick={() => setMode("note")}
            className={mode === "note" ? "font-medium text-foreground" : "text-muted-foreground hover:underline"}
          >
            {t("modeNote")}
          </button>
        </div>

        {mode === "reply" && aiStatus !== "active" && (
          <Button type="button" variant="outline" size="sm" disabled={isSuggesting} onClick={handleSuggest}>
            {isSuggesting ? t("suggesting") : t("suggestReply")}
          </Button>
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t(placeholderKey)}
            rows={2}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center gap-1">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setContent((current) => current + emoji)}
                className="rounded px-1 text-sm hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="ml-2 text-xs text-muted-foreground hover:underline">
                  {t("templates")}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {templates.length === 0 && (
                  <DropdownMenuItem disabled>{t("noTemplates")}</DropdownMenuItem>
                )}
                {templates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onSelect={() => setContent(template.content)}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{template.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      {t("deleteTemplate")}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {showNewTemplateForm ? (
                  <div className="flex items-center gap-1 p-1" onClick={(event) => event.stopPropagation()}>
                    <input
                      value={newTemplateName}
                      onChange={(event) => setNewTemplateName(event.target.value)}
                      placeholder={t("newTemplateNamePlaceholder")}
                      className="h-7 w-32 rounded border bg-transparent px-2 text-xs outline-none"
                    />
                    <Button type="button" size="sm" className="h-7" onClick={handleSaveTemplate}>
                      {t("saveTemplate")}
                    </Button>
                  </div>
                ) : (
                  <DropdownMenuItem onSelect={() => setShowNewTemplateForm(true)}>
                    {t("newTemplate")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Button type="button" onClick={handleSend} disabled={isSending || !content.trim()}>
          {isSending ? t("sending") : mode === "log" ? t("logSubmit") : mode === "note" ? t("saveNote") : t("sendReply")}
        </Button>
      </div>
    </div>
  );
}
