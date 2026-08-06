"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyTicketAction } from "../actions/reply-ticket.action";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const t = useTranslations("support.thread");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;

    setIsSubmitting(true);
    const result = await replyTicketAction({ ticketId, content });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setContent("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} placeholder={t("replyPlaceholder")} />
      <div className="flex justify-end">
        <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
