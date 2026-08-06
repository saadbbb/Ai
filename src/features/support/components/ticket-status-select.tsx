"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supportTicketStatusEnum, type SupportTicketStatus } from "@/db/schema";
import { updateTicketStatusAction } from "../actions/update-ticket-status.action";

export function TicketStatusSelect({ ticketId, initialStatus }: { ticketId: string; initialStatus: SupportTicketStatus }) {
  const router = useRouter();
  const t = useTranslations("platformAdmin.tickets");
  const [status, setStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: SupportTicketStatus) {
    setIsSaving(true);
    const result = await updateTicketStatusAction({ ticketId, status: next });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setStatus(next);
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={(value) => handleChange(value as SupportTicketStatus)} disabled={isSaving}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportTicketStatusEnum.enumValues.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`statuses.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
