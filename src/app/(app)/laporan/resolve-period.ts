import {
  addWibDays,
  endOfWibDay,
  parseWibDateInput,
  startOfWibDay,
  wibStartOf,
  wibWeekday,
  wibYmd,
} from "@/shared/format/wib";

export type PeriodKey =
  | "today"
  | "yesterday"
  | "week"
  | "7d"
  | "30d"
  | "month"
  | "lastmonth"
  | "year"
  | "custom";

export interface ResolvedPeriod {
  key: PeriodKey;
  start: Date;
  end: Date;
  label: string;
}

/**
 * Report periods (PRD 54), driven entirely by the URL so pages stay server
 * components. Every boundary is a WIB calendar day: the server runs in UTC, and
 * a UTC "day" would begin at 07:00 WIB and split the shop's evening sales from
 * its morning ones.
 */
export function resolvePeriod(
  searchParams: { period?: string; from?: string; to?: string },
  now: Date = new Date()
): ResolvedPeriod {
  const today = startOfWibDay(now);
  const { year, month } = wibYmd(now);

  if (searchParams.period === "custom" && searchParams.from && searchParams.to) {
    const from = parseWibDateInput(searchParams.from);
    const to = parseWibDateInput(searchParams.to);
    if (from && to && from.getTime() <= to.getTime()) {
      return { key: "custom", start: from, end: endOfWibDay(to), label: "Custom" };
    }
  }

  switch (searchParams.period) {
    case "today":
      return { key: "today", start: today, end: endOfWibDay(now), label: "Hari Ini" };
    case "yesterday": {
      const y = addWibDays(today, -1);
      return { key: "yesterday", start: y, end: endOfWibDay(y), label: "Kemarin" };
    }
    case "week": {
      // Calendar week, Monday first, as a shop week is counted here.
      const sinceMonday = (wibWeekday(now) + 6) % 7;
      return { key: "week", start: addWibDays(today, -sinceMonday), end: endOfWibDay(now), label: "Minggu Ini" };
    }
    case "lastmonth":
      return {
        key: "lastmonth",
        start: wibStartOf(year, month - 1, 1),
        // Day 0 of this month is the last day of the previous one.
        end: endOfWibDay(wibStartOf(year, month, 0)),
        label: "Bulan Lalu",
      };
    case "30d":
      return { key: "30d", start: addWibDays(today, -29), end: endOfWibDay(now), label: "30 Hari Terakhir" };
    case "month":
      return { key: "month", start: wibStartOf(year, month, 1), end: endOfWibDay(now), label: "Bulan Ini" };
    case "year":
      return { key: "year", start: wibStartOf(year, 1, 1), end: endOfWibDay(now), label: "Tahun Ini" };
    default:
      return { key: "7d", start: addWibDays(today, -6), end: endOfWibDay(now), label: "7 Hari Terakhir" };
  }
}
