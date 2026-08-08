export const ANALYTICS_RANGE_KEYS = ["today", "yesterday", "7d", "30d", "90d", "month", "custom"] as const;
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

export function enumerateDays(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  while (cursor.getTime() <= end.getTime()) {
    days.push(toDayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function parseCustomBound(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Parses the ?range= query param into a concrete UTC date window. Defaults to
 * 30d for anything missing/unrecognized rather than erroring — this only ever
 * drives a read-only report, so a bad query string should just show something
 * reasonable instead of failing the page. "custom" additionally reads
 * ?from=&to= (YYYY-MM-DD) — falls back to 30d if either is missing/invalid/
 * out of order, same reasoning.
 */
export function resolveAnalyticsRange(
  rangeParam: string | undefined,
  fromParam?: string,
  toParam?: string,
): AnalyticsRange {
  const key = ANALYTICS_RANGE_KEYS.includes(rangeParam as AnalyticsRangeKey) ? (rangeParam as AnalyticsRangeKey) : "30d";
  const now = new Date();

  if (key === "custom") {
    const customFrom = parseCustomBound(fromParam);
    const customTo = parseCustomBound(toParam);
    if (customFrom && customTo && customFrom.getTime() <= customTo.getTime()) {
      const from = startOfUtcDay(customFrom);
      return { key, from, to: customTo, days: enumerateDays(from, customTo) };
    }
    // Invalid/missing bounds — fall back to the same window as "30d".
    const from = startOfUtcDay(now);
    from.setUTCDate(from.getUTCDate() - 29);
    return { key, from, to: now, days: enumerateDays(from, now) };
  }

  if (key === "today") {
    const from = startOfUtcDay(now);
    return { key, from, to: now, days: enumerateDays(from, now) };
  }

  if (key === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const from = startOfUtcDay(yesterday);
    const to = new Date(startOfUtcDay(now).getTime() - 1);
    return { key, from, to, days: enumerateDays(from, to) };
  }

  let from: Date;
  if (key === "90d") {
    from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 89);
  } else if (key === "month") {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else if (key === "7d") {
    from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 6);
  } else {
    from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 29);
  }

  from = startOfUtcDay(from);
  return { key, from, to: now, days: enumerateDays(from, now) };
}
