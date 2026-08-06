"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setAiEnabledAction } from "../actions/set-ai-enabled.action";

export function AiEnabledToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const t = useTranslations("platformAdmin.aiOperations");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: boolean) {
    setIsSaving(true);
    const result = await setAiEnabledAction({ enabled: next });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setEnabled(next);
    toast.success(next ? t("enabledToast") : t("disabledToast"));
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{t("killSwitchLabel")}</p>
        <p className="text-sm text-muted-foreground">{enabled ? t("killSwitchOnHint") : t("killSwitchOffHint")}</p>
      </div>
      <Switch checked={enabled} onCheckedChange={handleChange} disabled={isSaving} />
    </div>
  );
}
