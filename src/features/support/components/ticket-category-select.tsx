"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supportTicketCategoryEnum, type SupportTicketCategory } from "@/db/schema";
import { setTicketCategoryAction } from "../actions/set-ticket-category.action";

export function TicketCategorySelect({ ticketId, initialCategory }: { ticketId: string; initialCategory: SupportTicketCategory }) {
  const router = useRouter();
  const t = useTranslations("platformAdmin.tickets");
  const [category, setCategory] = useState(initialCategory);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: SupportTicketCategory) {
    setIsSaving(true);
    const result = await setTicketCategoryAction({ ticketId, category: next });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCategory(next);
    router.refresh();
  }

  return (
    <Select value={category} onValueChange={(value) => handleChange(value as SupportTicketCategory)} disabled={isSaving}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportTicketCategoryEnum.enumValues.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`categories.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
