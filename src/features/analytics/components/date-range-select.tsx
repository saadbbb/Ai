"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANALYTICS_RANGE_KEYS, type AnalyticsRangeKey } from "../lib/date-range";

export function DateRangeSelect({
  value,
  labels,
}: {
  value: AnalyticsRangeKey;
  labels: Record<AnalyticsRangeKey, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    startTransition(() => {
      router.push(`/dashboard/analytics?range=${next}`);
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ANALYTICS_RANGE_KEYS.map((key) => (
          <SelectItem key={key} value={key}>
            {labels[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
