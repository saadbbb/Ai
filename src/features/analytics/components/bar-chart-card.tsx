"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartDatum {
  label: string;
  value: number;
}

function ChartTooltip({
  active,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="font-medium text-popover-foreground">{datum.label}</p>
      <p className="text-muted-foreground">{valueFormatter(datum.value)}</p>
    </div>
  );
}

/**
 * Single-series magnitude-by-category bars — always one hue (--chart-1). Per
 * the data-viz method, per-category rainbow coloring is reserved for when
 * category identity is compared *across* series; a lone count-per-category
 * measure like this only needs identity from the axis labels themselves.
 */
export function BarChartCard({
  title,
  data,
  emptyMessage,
  valueFormatter = (value: number) => value.toLocaleString(),
}: {
  title: string;
  data: ChartDatum[];
  emptyMessage: string;
  valueFormatter?: (value: number) => string;
}) {
  const hasData = data.some((row) => row.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={<ChartTooltip valueFormatter={valueFormatter} />}
                />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="flex h-56 items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
