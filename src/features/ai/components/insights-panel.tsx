"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getInsightsAction } from "../actions/get-insights.action";

type Status = "loading" | "ready" | "unavailable";

export function InsightsPanel() {
  const t = useTranslations("dashboard.insights");
  const [status, setStatus] = useState<Status>("loading");
  const [insights, setInsights] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load(forceRefresh: boolean) {
    if (forceRefresh) setIsRefreshing(true);
    const result = await getInsightsAction({ forceRefresh });
    if (forceRefresh) setIsRefreshing(false);

    if (!result.success || result.data.unavailable) {
      setStatus("unavailable");
      return;
    }

    setInsights(result.data.insights);
    setStatus("ready");
  }

  useEffect(() => {
    load(false);
    // Runs once on mount — the initial (possibly cached) load, not a refresh.
  }, []);

  if (status === "loading") {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "unavailable") {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">{t("heading")}</h2>
          <Button type="button" variant="ghost" size="sm" disabled={isRefreshing} onClick={() => load(true)}>
            {isRefreshing ? t("refreshing") : t("refresh")}
          </Button>
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="text-sm">
                {insight}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
