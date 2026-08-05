"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
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
 * Single-series magnitude-by-category bars — always one hue (--chart-1). Per
 * the data-viz method, per-category rainbow coloring is reserved for when
 * category identity is compared *across* series; a lone count-per-category
 * measure like this only needs identity from the axis labels themselves.
 *
 * `format` is a plain string, not a formatter function — a Server Component
 * page can't pass a function prop across the client-component boundary.
 */
export function BarChartCard({
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
              <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip format={format} />} />
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
