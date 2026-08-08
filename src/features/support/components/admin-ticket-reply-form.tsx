"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminReplyTicketAction } from "../actions/admin-reply-ticket.action";

export function AdminTicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const t = useTranslations("platformAdmin.tickets.thread");
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;

    setIsSubmitting(true);
    const result = await adminReplyTicketAction({ ticketId, content, isInternal });
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
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        placeholder={isInternal ? t("internalNotePlaceholder") : t("replyPlaceholder")}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={isInternal} onCheckedChange={setIsInternal} size="sm" />
          {t("internalNoteToggle")}
        </label>
        <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? t("submitting") : isInternal ? t("submitInternal") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
