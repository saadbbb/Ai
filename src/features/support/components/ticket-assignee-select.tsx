"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignTicketAction } from "../actions/assign-ticket.action";

const UNASSIGNED = "unassigned";

export function TicketAssigneeSelect({
  ticketId,
  initialAssigneeUserId,
  admins,
}: {
  ticketId: string;
  initialAssigneeUserId: string | null;
  admins: { userId: string; email: string }[];
}) {
  const router = useRouter();
  const t = useTranslations("platformAdmin.tickets");
  const [assigneeUserId, setAssigneeUserId] = useState(initialAssigneeUserId ?? UNASSIGNED);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: string) {
    setIsSaving(true);
    const result = await assignTicketAction({ ticketId, assignToUserId: next === UNASSIGNED ? null : next });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAssigneeUserId(next);
    router.refresh();
  }

  return (
    <Select value={assigneeUserId} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>{t("unassigned")}</SelectItem>
        {admins.map((admin) => (
          <SelectItem key={admin.userId} value={admin.userId}>
            {admin.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
