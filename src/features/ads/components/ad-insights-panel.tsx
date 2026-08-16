"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsCard } from "@/components/settings-card";
import { Button } from "@/components/ui/button";
import { generateAdInsightsAction } from "../actions/generate-ad-insights.action";

export function AdInsightsPanel() {
  const t = useTranslations("ads.insights");
  const [insights, setInsights] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    const result = await generateAdInsightsAction();
    setIsGenerating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setInsights(result.data);
  }

  return (
    <SettingsCard
      title={t("heading")}
      description={t("description")}
      actions={
        <Button type="button" variant="outline" size="sm" disabled={isGenerating} onClick={handleGenerate}>
          {isGenerating ? t("generating") : t("generate")}
        </Button>
      }
    >
      {insights && <p className="rounded-lg border bg-muted/50 p-3 text-sm">{insights}</p>}
    </SettingsCard>
  );
}
