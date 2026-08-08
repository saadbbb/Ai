"use client";

import { MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { askStoreAssistantAction } from "../actions/ask-store-assistant.action";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function StoreAssistantWidget({ slug }: { slug: string }) {
  const t = useTranslations("website.public.assistant");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    const content = input.trim();
    if (!content || isSending) return;

    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setInput("");
    setIsSending(true);

    const result = await askStoreAssistantAction({ slug, history });
    setIsSending(false);

    if (!result.success) {
      setMessages((current) => [...current, { role: "assistant", content: result.error.message }]);
      return;
    }

    setMessages((current) => [...current, { role: "assistant", content: result.data.text }]);
  }

  return (
    <div className="fixed bottom-4 end-4 z-50">
      {isOpen && (
        <div className="mb-3 flex h-96 w-80 flex-col rounded-lg border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <p className="text-sm font-medium">{t("title")}</p>
            <button type="button" onClick={() => setIsOpen(false)} aria-label={t("close")}>
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && <p className="text-xs text-muted-foreground">{t("greeting")}</p>}
            {messages.map((message, index) => (
              <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-xs",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 border-t p-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("placeholder")}
              rows={1}
              className="min-h-9 flex-1 text-sm"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button type="button" size="sm" disabled={isSending} onClick={handleSend}>
              {t("send")}
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={t("open")}
        className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
      >
        {isOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>
    </div>
  );
}
