export const ANALYTICS_RANGE_KEYS = ["7d", "30d", "90d", "month"] as const;
export type AnalyticsRangeKey = (typeof ANALYTICS_RANGE_KEYS)[number];

export interface AnalyticsRange {
  key: AnalyticsRangeKey;
  from: Date;
  to: Date;
  /** Number of day buckets between from/to, inclusive — used to fill zero-count gaps. */
  days: string[];
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function enumerateDays(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  while (cursor.getTime() <= end.getTime()) {
    days.push(toDayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/**
 * Parses the ?range= query param into a concrete UTC date window. Defaults to
 * 30d for anything missing/unrecognized rather than erroring — this only ever
 * drives a read-only report, so a bad query string should just show something
 * reasonable instead of failing the page.
 */
export function resolveAnalyticsRange(rangeParam: string | undefined): AnalyticsRange {
  const key = ANALYTICS_RANGE_KEYS.includes(rangeParam as AnalyticsRangeKey) ? (rangeParam as AnalyticsRangeKey) : "30d";
  const now = new Date();
  const to = now;
  let from: Date;

  if (key === "7d") {
    from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 6);
  } else if (key === "90d") {
    from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 89);
  } else if (key === "month") {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else {
    from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 29);
  }

  from = startOfUtcDay(from);
  return { key, from, to, days: enumerateDays(from, to) };
}
