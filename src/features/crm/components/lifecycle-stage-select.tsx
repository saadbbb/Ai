"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contactLifecycleStageEnum, type ContactLifecycleStage } from "@/db/schema";
import { setLifecycleStageAction } from "../actions/set-lifecycle-stage.action";

export function LifecycleStageSelect({ contactId, initialStage }: { contactId: string; initialStage: ContactLifecycleStage }) {
  const router = useRouter();
  const t = useTranslations("contacts");
  const [stage, setStage] = useState(initialStage);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: ContactLifecycleStage) {
    setIsSaving(true);
    const result = await setLifecycleStageAction({ contactId, stage: next });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setStage(next);
    router.refresh();
  }

  return (
    <Select value={stage} onValueChange={(value) => handleChange(value as ContactLifecycleStage)} disabled={isSaving}>
      <SelectTrigger size="sm" className="h-6 w-auto rounded-full border-none bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {contactLifecycleStageEnum.enumValues.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`lifecycle.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
