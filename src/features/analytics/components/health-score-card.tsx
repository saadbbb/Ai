import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthScore, HealthScoreLevel } from "../services/analytics.service";

const LEVEL_COLOR: Record<HealthScoreLevel, string> = {
  excellent: "var(--status-good)",
  good: "var(--status-good)",
  needs_attention: "var(--status-warning)",
  critical: "var(--status-critical)",
};

export function HealthScoreCard({
  healthScore,
  title,
  noDataMessage,
  levelLabels,
  breakdownLabels,
}: {
  healthScore: HealthScore;
  title: string;
  noDataMessage: string;
  levelLabels: Record<HealthScoreLevel, string>;
  breakdownLabels: Record<HealthScore["breakdown"][number]["key"], string>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthScore.score === null || healthScore.level === null ? (
          <p className="text-sm text-muted-foreground">{noDataMessage}</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-4xl font-semibold tabular-nums">{healthScore.score}</span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: LEVEL_COLOR[healthScore.level] }}
            >
              {levelLabels[healthScore.level]}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          {healthScore.breakdown.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
              <span className="text-muted-foreground">{breakdownLabels[item.key]}</span>
              <span className="font-medium tabular-nums">{item.rate === null ? "—" : `${Math.round(item.rate * 100)}%`}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
