import { describe, expect, it } from "vitest";
import { isNight, timeOfDay } from "./time-of-day";

describe("timeOfDay", () => {
  it("splits the day at 05, 11, 15 and 18", () => {
    expect(timeOfDay(5)).toBe("PAGI");
    expect(timeOfDay(10)).toBe("PAGI");
    expect(timeOfDay(11)).toBe("SIANG");
    expect(timeOfDay(14)).toBe("SIANG");
    expect(timeOfDay(15)).toBe("SORE");
    expect(timeOfDay(17)).toBe("SORE");
    expect(timeOfDay(18)).toBe("MALAM");
  });

  it("treats the small hours as night, not morning", () => {
    expect(timeOfDay(0)).toBe("MALAM");
    expect(timeOfDay(4)).toBe("MALAM");
  });
});

describe("isNight", () => {
  it("is true from 18:00 through 04:59 and false by day", () => {
    for (const h of [18, 21, 23, 0, 2, 4]) expect(isNight(h)).toBe(true);
    for (const h of [5, 8, 12, 15, 17]) expect(isNight(h)).toBe(false);
  });
});
