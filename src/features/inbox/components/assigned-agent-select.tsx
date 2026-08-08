"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignConversationAction } from "../actions/assign-conversation.action";

const UNASSIGNED = "__unassigned__";

export function AssignedAgentSelect({
  conversationId,
  initialAssignedUserId,
  members,
}: {
  conversationId: string;
  initialAssignedUserId: string | null;
  members: { id: string; email: string }[];
}) {
  const t = useTranslations("inbox.thread");
  const [assignedUserId, setAssignedUserId] = useState(initialAssignedUserId ?? UNASSIGNED);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: string) {
    if (value === UNASSIGNED) return;

    setIsSaving(true);
    const result = await assignConversationAction({ conversationId, userId: value });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAssignedUserId(value);
  }

  return (
    <Select value={assignedUserId} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger size="sm" className="h-6 w-auto rounded-full border-none bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <SelectValue placeholder={t("unassigned")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED} disabled>
          {t("unassigned")}
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
