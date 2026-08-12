"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { AiCreativity } from "@/db/schema";
import { RadioOptionGroup } from "@/features/onboarding/components/radio-option-group";
import { setDefaultCreativityAction } from "../actions/set-default-creativity.action";

const CREATIVITY_VALUES: AiCreativity[] = ["low", "medium", "high"];

export function DefaultCreativityControl({ initialCreativity }: { initialCreativity: AiCreativity }) {
  const t = useTranslations("platformAdmin.aiOperations");
  const [creativity, setCreativity] = useState<AiCreativity>(initialCreativity);

  const options = CREATIVITY_VALUES.map((value) => ({
    value,
    label: t(`creativity.${value}.label`),
    description: t(`creativity.${value}.description`),
  }));

  async function handleChange(next: string) {
    const value = next as AiCreativity;
    const result = await setDefaultCreativityAction({ creativity: value });

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCreativity(value);
    toast.success(t("defaultCreativitySavedToast"));
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{t("defaultCreativityLabel")}</p>
        <p className="text-sm text-muted-foreground">{t("defaultCreativityHint")}</p>
      </div>
      <RadioOptionGroup name="defaultCreativity" value={creativity} onValueChange={handleChange} options={options} />
    </div>
  );
}
