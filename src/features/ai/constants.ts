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

export const WEEKDAYS: Array<{ key: keyof WorkingHours["schedule"]; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];
