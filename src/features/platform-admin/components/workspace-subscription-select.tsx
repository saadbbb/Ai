"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subscriptionStatusEnum, type SubscriptionStatus } from "@/db/schema";
import { updateWorkspaceSubscriptionAction } from "../actions/update-workspace-subscription.action";

const STATUSES = subscriptionStatusEnum.enumValues;

export function WorkspaceSubscriptionSelect({
  workspaceId,
  initialStatus,
}: {
  workspaceId: string;
  initialStatus: SubscriptionStatus;
}) {
  const t = useTranslations("platformAdmin.workspaces");
  const [status, setStatus] = useState(initialStatus);

  async function handleChange(next: SubscriptionStatus) {
    const previous = status;
    setStatus(next);

    const result = await updateWorkspaceSubscriptionAction({ workspaceId, status: next });
    if (!result.success) {
      toast.error(result.error.message);
      setStatus(previous);
    }
  }

  return (
    <Select value={status} onValueChange={(value) => handleChange(value as SubscriptionStatus)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`statuses.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
