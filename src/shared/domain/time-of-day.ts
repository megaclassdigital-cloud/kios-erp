/**
 * Which part of the day an hour (0-23) falls in. Pure, so the header icon and
 * any future greeting agree on where morning ends and night begins.
 *
 * Night wraps midnight (18:00-04:59); that is why it is the fallthrough case
 * rather than a range check.
 */
export type TimeOfDay = "PAGI" | "SIANG" | "SORE" | "MALAM";

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 11) return "PAGI";
  if (hour >= 11 && hour < 15) return "SIANG";
  if (hour >= 15 && hour < 18) return "SORE";
  return "MALAM";
}

/** The moon replaces the sun from dusk until dawn. */
export function isNight(hour: number): boolean {
  return timeOfDay(hour) === "MALAM";
}
