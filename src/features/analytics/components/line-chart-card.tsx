"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartDatum {
  label: string;
  value: number;
}

type ValueFormat = "number" | "currency";

const FORMATTERS: Record<ValueFormat, (value: number) => string> = {
  number: (value) => value.toLocaleString(),
  currency: (value) => value.toFixed(2),
};

function ChartTooltip({
  active,
  payload,
  format,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
  format: ValueFormat;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="font-medium text-popover-foreground">{datum.label}</p>
      <p className="text-muted-foreground">{FORMATTERS[format](datum.value)}</p>
    </div>
  );
}

/**
 * Single-series change-over-time — a line, not bars-by-category (see the
 * dataviz skill's "choosing a form": a day-bucketed trend is a magnitude
 * changing over time, which reads as a line; BarChartCard stays reserved for
 * genuine category comparisons like orders-by-status). One hue (--chart-1),
 * matching BarChartCard's single-series convention — a lone trend needs no
 * legend, its identity comes from the card title.
 */
export function LineChartCard({
  title,
  data,
  emptyMessage,
  format = "number",
}: {
  title: string;
  data: ChartDatum[];
  emptyMessage: string;
  format?: ValueFormat;
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
              <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <Tooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltip format={format} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
                />
              </LineChart>
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
