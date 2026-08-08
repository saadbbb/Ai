"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANALYTICS_RANGE_KEYS, type AnalyticsRangeKey } from "../lib/date-range";

export function DateRangeSelect({
  value,
  labels,
  applyLabel,
  from,
  to,
  basePath = "/dashboard/analytics",
}: {
  value: AnalyticsRangeKey;
  labels: Record<AnalyticsRangeKey, string>;
  applyLabel: string;
  from?: string;
  to?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function handleChange(next: string) {
    if (next === "custom") return;
    startTransition(() => {
      router.push(`${basePath}?range=${next}`);
    });
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) return;
    startTransition(() => {
      router.push(`${basePath}?range=custom&from=${customFrom}&to=${customTo}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger size="sm" className="w-auto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ANALYTICS_RANGE_KEYS.filter((key) => key !== "custom").map((key) => (
            <SelectItem key={key} value={key}>
              {labels[key]}
            </SelectItem>
          ))}
          <SelectItem value="custom">{labels.custom}</SelectItem>
        </SelectContent>
      </Select>
      {value === "custom" && (
        <div className="flex items-center gap-2">
          <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-8 w-auto" />
          <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-8 w-auto" />
          <button
            type="button"
            onClick={applyCustomRange}
            disabled={isPending || !customFrom || !customTo}
            className="text-xs text-primary underline disabled:opacity-50"
          >
            {applyLabel}
          </button>
        </div>
      )}
    </div>
  );
}
