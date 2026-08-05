import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAnalyticsRange } from "./date-range";

const FAKE_NOW = new Date("2026-03-15T10:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveAnalyticsRange", () => {
  it("7d covers exactly 7 inclusive days", () => {
    const range = resolveAnalyticsRange("7d");
    expect(range.key).toBe("7d");
    expect(range.days).toHaveLength(7);
    expect(range.days[range.days.length - 1]).toBe("2026-03-15");
    expect(range.days[0]).toBe("2026-03-09");
  });

  it("30d covers exactly 30 inclusive days", () => {
    const range = resolveAnalyticsRange("30d");
    expect(range.key).toBe("30d");
    expect(range.days).toHaveLength(30);
  });

  it("90d covers exactly 90 inclusive days", () => {
    const range = resolveAnalyticsRange("90d");
    expect(range.key).toBe("90d");
    expect(range.days).toHaveLength(90);
  });

  it("month covers from the 1st of the current UTC month through today", () => {
    const range = resolveAnalyticsRange("month");
    expect(range.key).toBe("month");
    expect(range.days[0]).toBe("2026-03-01");
    expect(range.days[range.days.length - 1]).toBe("2026-03-15");
    expect(range.days).toHaveLength(15);
  });

  it("falls back to 30d for an unrecognized range param", () => {
    const range = resolveAnalyticsRange("not-a-real-range");
    expect(range.key).toBe("30d");
    expect(range.days).toHaveLength(30);
  });

  it("falls back to 30d when the range param is undefined", () => {
    const range = resolveAnalyticsRange(undefined);
    expect(range.key).toBe("30d");
  });
});
