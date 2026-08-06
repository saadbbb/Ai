"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supportTicketPriorityEnum, type SupportTicketPriority } from "@/db/schema";
import { createTicketAction } from "../actions/create-ticket.action";

export function NewTicketForm() {
  const router = useRouter();
  const t = useTranslations("support.new");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) {
      toast.error(t("requiredHint"));
      return;
    }

    setIsSubmitting(true);
    const result = await createTicketAction({ subject, message, priority });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push(`/dashboard/support/${result.data.id}`);
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("subjectLabel")}</label>
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={t("subjectPlaceholder")} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("priorityLabel")}</label>
          <Select value={priority} onValueChange={(value) => setPriority(value as SupportTicketPriority)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportTicketPriorityEnum.enumValues.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`priorities.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("messageLabel")}</label>
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} placeholder={t("messagePlaceholder")} />
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
