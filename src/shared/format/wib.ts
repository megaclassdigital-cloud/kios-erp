/**
 * Dates as the shop sees them (WIB), regardless of where the code runs.
 * The server is in UTC and the browser in the shopkeeper's zone; routing both
 * the screen and the XLSX through here keeps them printing the same minute.
 */
const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function pick(date: Date) {
  const o: Record<string, string> = {};
  for (const p of parts.formatToParts(date)) o[p.type] = p.value;
  return o;
}

/** dd/MM/yyyy */
export function formatWibDate(date: Date): string {
  const p = pick(date);
  return `${p.day}/${p.month}/${p.year}`;
}

/** dd/MM/yyyy HH:mm */
export function formatWibDateTime(date: Date): string {
  const p = pick(date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/**
 * Calendar days in WIB (UTC+7, no daylight saving). The server runs in UTC, so
 * `new Date().setHours(0,0,0,0)` starts the "day" at 07:00 WIB and a sale rung
 * up at 06:30 WIB lands in yesterday. Every day, month and year boundary in
 * reports goes through these instead.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WibYmd {
  year: number;
  month: number; // 1-12
  day: number;
}

/** The WIB calendar date a moment falls on. */
export function wibYmd(date: Date): WibYmd {
  const shifted = new Date(date.getTime() + WIB_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** 00:00:00.000 WIB of the given calendar date (month/day may overflow, like Date.UTC). */
export function wibStartOf(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - WIB_OFFSET_MS);
}

export function startOfWibDay(date: Date): Date {
  const { year, month, day } = wibYmd(date);
  return wibStartOf(year, month, day);
}

/** 23:59:59.999 WIB of the day the moment falls on. */
export function endOfWibDay(date: Date): Date {
  return new Date(startOfWibDay(date).getTime() + DAY_MS - 1);
}

/** 0 = Sunday … 6 = Saturday, as the shop's calendar sees the day. */
export function wibWeekday(date: Date): number {
  return new Date(date.getTime() + WIB_OFFSET_MS).getUTCDay();
}

/** yyyy-MM-dd of the WIB day, used to group sales per day. */
export function wibDayKey(date: Date): string {
  const { year, month, day } = wibYmd(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** dd/MM of the WIB day. */
export function wibDayLabel(date: Date): string {
  const { month, day } = wibYmd(date);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

/** HH:mm in WIB. */
export function formatWibTime(date: Date): string {
  return formatWibDateTime(date).slice(11);
}

/** Moves a moment by whole WIB days (start-of-day stays start-of-day). */
export function addWibDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Parses a yyyy-MM-dd from a date input as that day in WIB; null if malformed. */
export function parseWibDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = wibStartOf(y, mo, d);
  return wibYmd(date).day === d ? date : null;
}
