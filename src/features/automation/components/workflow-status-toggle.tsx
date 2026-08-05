"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { WorkflowStatus } from "@/db/schema";
import { setWorkflowStatusAction } from "../actions/set-workflow-status.action";

export function WorkflowStatusToggle({ workflowId, initialStatus }: { workflowId: string; initialStatus: WorkflowStatus }) {
  const t = useTranslations("automations");
  const [status, setStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggle() {
    const next: WorkflowStatus = status === "active" ? "paused" : "active";
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
    <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleToggle}>
      {status === "active" ? t("pause") : t("resume")}
    </Button>
  );
}
