import type { WorkingHours } from "@/db/schema";

const DAY_INDEX_TO_KEY: Array<keyof WorkingHours["schedule"]> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Pure so it's cheaply unit-testable — callers (automation conditions,
 * future AI prompt "are we open" context) pass in `now` for deterministic
 * tests; production call sites just omit it. No working hours configured =
 * fail open (always "within hours") rather than silently blocking everything.
 */
export function isWithinWorkingHours(workingHours: WorkingHours | null | undefined, now: Date = new Date()): boolean {
  if (!workingHours) return true;

  const zoned = new Date(now.toLocaleString("en-US", { timeZone: workingHours.timezone }));
  const day = workingHours.schedule[DAY_INDEX_TO_KEY[zoned.getDay()]];
  if (!day || day.closed) return false;

  const minutesNow = zoned.getHours() * 60 + zoned.getMinutes();
  const [openHour, openMinute] = day.open.split(":").map(Number);
  const [closeHour, closeMinute] = day.close.split(":").map(Number);
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  return minutesNow >= openMinutes && minutesNow < closeMinutes;
}
