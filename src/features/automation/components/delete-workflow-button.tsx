"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteWorkflowAction } from "../actions/delete-workflow.action";

export function DeleteWorkflowButton({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const t = useTranslations("common");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t("confirmDelete"))) return;

    setIsDeleting(true);
    const result = await deleteWorkflowAction({ workflowId });
    setIsDeleting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="sm" disabled={isDeleting} onClick={handleDelete}>
      {t("delete")}
    </Button>
  );
}
