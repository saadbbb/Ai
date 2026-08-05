"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateTestReplyAction } from "../actions/generate-test-reply.action";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  needsHumanHandover?: boolean;
}

export function TestChat() {
  const t = useTranslations("aiTest");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    const content = input.trim();
    if (!content || isSending) return;

    const nextMessages: DisplayMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    const result = await generateTestReplyAction({
      history: nextMessages.map(({ role, content }) => ({ role, content })),
    });

    setIsSending(false);

    if (!result.success) {
      setMessages((current) => [...current, { role: "assistant", content: result.error.message }]);
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "assistant", content: result.data.text, needsHumanHandover: result.data.needsHumanHandover },
    ]);
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">{t("emptyState")}</p>}
        {messages.map((message, index) => (
          <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.needsHumanHandover && (
                <p className="mt-1 text-xs font-medium text-destructive">{t("humanHandoverBadge")}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("placeholder")}
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
          {isSending ? t("sending") : t("send")}
        </Button>
      </div>
    </div>
  );
}
