"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{t("heading")}</p>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? t("generating") : t("generate")}
          </Button>
        </div>
        {insights && <p className="rounded-lg border bg-muted/50 p-3 text-sm">{insights}</p>}
      </CardContent>
    </Card>
  );
}
