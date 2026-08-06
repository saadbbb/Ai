"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workflowStatusEnum, type WorkflowStatus } from "@/db/schema";
import { setWorkflowStatusAction } from "../actions/set-workflow-status.action";

export function WorkflowStatusToggle({ workflowId, initialStatus }: { workflowId: string; initialStatus: WorkflowStatus }) {
  const t = useTranslations("automations");
  const [status, setStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: WorkflowStatus) {
    setIsSaving(true);
    const result = await setWorkflowStatusAction({ workflowId, status: next });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setStatus(next);
  }

  return (
    <Select value={status} onValueChange={(value) => handleChange(value as WorkflowStatus)} disabled={isSaving}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {workflowStatusEnum.enumValues.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`statuses.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
