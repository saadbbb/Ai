"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createLeadFromConversationAction } from "../actions/create-lead-from-conversation.action";

export function CreateLeadButton({
  conversationId,
  initialLeadId,
}: {
  conversationId: string;
  initialLeadId: string | null;
}) {
  const t = useTranslations("inbox.thread");
  const [leadId, setLeadId] = useState(initialLeadId);
  const [isCreating, setIsCreating] = useState(false);

  if (leadId) {
    return (
      <Link href="/dashboard/leads" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
        {t("viewInPipeline")}
      </Link>
    );
  }

  async function handleCreate() {
    setIsCreating(true);
    const result = await createLeadFromConversationAction({ conversationId });
    setIsCreating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setLeadId(result.data.id);
    toast.success(t("leadCreated"));
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isCreating} onClick={handleCreate}>
      {t("createLead")}
    </Button>
  );
}
