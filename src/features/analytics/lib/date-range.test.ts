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

  it("today covers just today so far", () => {
    const range = resolveAnalyticsRange("today");
    expect(range.key).toBe("today");
    expect(range.days).toEqual(["2026-03-15"]);
    expect(range.to).toEqual(FAKE_NOW);
  });

  it("yesterday covers exactly the prior UTC day", () => {
    const range = resolveAnalyticsRange("yesterday");
    expect(range.key).toBe("yesterday");
    expect(range.days).toEqual(["2026-03-14"]);
    expect(range.from).toEqual(new Date("2026-03-14T00:00:00.000Z"));
    expect(range.to).toEqual(new Date("2026-03-14T23:59:59.999Z"));
  });

  it("custom uses the given from/to bounds", () => {
    const range = resolveAnalyticsRange("custom", "2026-03-01", "2026-03-05T12:00:00.000Z");
    expect(range.key).toBe("custom");
    expect(range.days).toEqual(["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"]);
  });

  it("custom falls back to 30d when from is missing", () => {
    const range = resolveAnalyticsRange("custom", undefined, "2026-03-05");
    expect(range.key).toBe("custom");
    expect(range.days).toHaveLength(30);
  });

  it("custom falls back to 30d when from is after to", () => {
    const range = resolveAnalyticsRange("custom", "2026-03-10", "2026-03-05");
    expect(range.key).toBe("custom");
    expect(range.days).toHaveLength(30);
  });
});
