"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlatformSettings } from "@/db/schema";
import { updatePlatformSettingsAction } from "../actions/update-platform-settings.action";

export function PlatformSettingsForm({ initialSettings }: { initialSettings: PlatformSettings | null }) {
  const t = useTranslations("platformAdmin.settings");
  const [whatsappNumber, setWhatsappNumber] = useState(initialSettings?.whatsappNumber ?? "");
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState(
    initialSettings?.whatsappMessageTemplate ?? "",
  );
  const [supportEmail, setSupportEmail] = useState(initialSettings?.supportEmail ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const result = await updatePlatformSettingsAction({ whatsappNumber, whatsappMessageTemplate, supportEmail });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("saved"));
  }

  return (
    <div className="max-w-lg space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("whatsappNumberLabel")}</label>
        <Input
          value={whatsappNumber}
          onChange={(event) => setWhatsappNumber(event.target.value)}
          placeholder={t("whatsappNumberPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">{t("whatsappNumberHint")}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("messageTemplateLabel")}</label>
        <Textarea
          value={whatsappMessageTemplate}
          onChange={(event) => setWhatsappMessageTemplate(event.target.value)}
          placeholder={t("messageTemplatePlaceholder")}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{t("messageTemplateHint")}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("supportEmailLabel")}</label>
        <Input
          type="email"
          value={supportEmail}
          onChange={(event) => setSupportEmail(event.target.value)}
          placeholder={t("supportEmailPlaceholder")}
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
