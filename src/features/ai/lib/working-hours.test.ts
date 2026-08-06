import { describe, expect, it } from "vitest";
import type { WorkingHours } from "@/db/schema";
import { isWithinWorkingHours } from "./working-hours";

const HOURS: WorkingHours = {
  timezone: "UTC",
  schedule: {
    mon: { closed: false, open: "09:00", close: "18:00" },
    tue: { closed: false, open: "09:00", close: "18:00" },
    wed: { closed: false, open: "09:00", close: "18:00" },
    thu: { closed: false, open: "09:00", close: "18:00" },
    fri: { closed: false, open: "09:00", close: "18:00" },
    sat: { closed: false, open: "09:00", close: "18:00" },
    sun: { closed: true, open: "09:00", close: "18:00" },
  },
  holidayNotes: null,
};

describe("isWithinWorkingHours", () => {
  it("returns true with no configured hours (fail open)", () => {
    expect(isWithinWorkingHours(null)).toBe(true);
    expect(isWithinWorkingHours(undefined)).toBe(true);
  });

  it("returns true during business hours on an open day", () => {
    // 2026-08-05 is a Wednesday
    expect(isWithinWorkingHours(HOURS, new Date("2026-08-05T12:00:00Z"))).toBe(true);
  });

  it("returns false before opening or after closing on an open day", () => {
    expect(isWithinWorkingHours(HOURS, new Date("2026-08-05T07:00:00Z"))).toBe(false);
    expect(isWithinWorkingHours(HOURS, new Date("2026-08-05T19:00:00Z"))).toBe(false);
  });

  it("returns false on a closed day even during open hours", () => {
    // 2026-08-02 is a Sunday
    expect(isWithinWorkingHours(HOURS, new Date("2026-08-02T12:00:00Z"))).toBe(false);
  });
});
