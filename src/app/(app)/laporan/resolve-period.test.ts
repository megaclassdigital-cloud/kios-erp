import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./resolve-period";
import { parseWibDateInput, startOfWibDay, wibDayKey } from "@/shared/format/wib";

// 2026-11-11 06:30 WIB is still 2026-11-10 23:30 UTC: the case a UTC server got wrong.
const earlyMorning = new Date("2026-11-10T23:30:00Z");

describe("WIB day boundaries", () => {
  it("starts the day at 00:00 WIB, not 07:00", () => {
    expect(startOfWibDay(earlyMorning).toISOString()).toBe("2026-11-10T17:00:00.000Z");
    expect(wibDayKey(earlyMorning)).toBe("2026-11-11");
  });

  it("today covers the whole WIB day", () => {
    const p = resolvePeriod({ period: "today" }, earlyMorning);
    expect(p.start.toISOString()).toBe("2026-11-10T17:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-11-11T16:59:59.999Z");
  });

  it("a sale at 06:30 WIB belongs to today, one at 23:59 WIB the day before does not", () => {
    const p = resolvePeriod({ period: "today" }, earlyMorning);
    expect(earlyMorning >= p.start && earlyMorning <= p.end).toBe(true);
    const lateYesterday = new Date("2026-11-10T16:59:00Z");
    expect(lateYesterday < p.start).toBe(true);
  });

  it("yesterday, week (Monday first), month, last month and year", () => {
    const now = new Date("2026-11-11T05:00:00Z"); // Wednesday
    expect(resolvePeriod({ period: "yesterday" }, now).start.toISOString()).toBe("2026-11-09T17:00:00.000Z");
    expect(resolvePeriod({ period: "week" }, now).start.toISOString()).toBe("2026-11-08T17:00:00.000Z");
    expect(resolvePeriod({ period: "month" }, now).start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    const last = resolvePeriod({ period: "lastmonth" }, now);
    expect(last.start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(last.end.toISOString()).toBe("2026-10-31T16:59:59.999Z");
    expect(resolvePeriod({ period: "year" }, now).start.toISOString()).toBe("2025-12-31T17:00:00.000Z");
  });

  it("custom range is inclusive of both WIB days and rejects bad input", () => {
    const p = resolvePeriod({ period: "custom", from: "2026-11-01", to: "2026-11-03" });
    expect(p.start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-11-03T16:59:59.999Z");
    expect(resolvePeriod({ period: "custom", from: "2026-11-05", to: "2026-11-03" }).key).toBe("7d");
    expect(parseWibDateInput("2026-02-31")).toBeNull();
  });
});
