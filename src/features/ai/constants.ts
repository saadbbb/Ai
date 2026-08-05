import type { WorkingHours } from "@/db/schema";

const OPEN_DAY = { closed: false, open: "09:00", close: "18:00" };
const CLOSED_DAY = { closed: true, open: "09:00", close: "18:00" };

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  timezone: "UTC",
  schedule: {
    mon: OPEN_DAY,
    tue: OPEN_DAY,
    wed: OPEN_DAY,
    thu: OPEN_DAY,
    fri: OPEN_DAY,
    sat: OPEN_DAY,
    sun: CLOSED_DAY,
  },
  holidayNotes: null,
};

export const WEEKDAY_KEYS: Array<keyof WorkingHours["schedule"]> = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];
