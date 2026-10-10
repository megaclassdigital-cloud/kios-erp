import { describe, expect, it } from "vitest";
import { ExpiryService } from "./expiry-service";

const service = new ExpiryService();
const now = new Date("2026-10-04T14:30:00");

function at(iso: string) {
  return new Date(iso);
}

describe("ExpiryService.classify", () => {
  it("does not track a product without a date", () => {
    expect(service.classify(null, 30, now)).toBe("TIDAK_DIPANTAU");
  });

  it("still counts something expiring later today as sellable", () => {
    // 07:00 is already past at 14:30, but a shopkeeper sells it all day.
    expect(service.classify(at("2026-10-04T07:00:00"), 30, now)).toBe("MENDEKATI");
  });

  it("marks yesterday as expired", () => {
    expect(service.classify(at("2026-10-03T23:59:00"), 30, now)).toBe("KEDALUWARSA");
  });

  it("warns exactly on the edge of the warning window", () => {
    expect(service.classify(at("2026-11-03T00:00:00"), 30, now)).toBe("MENDEKATI");
  });

  it("is safe one day beyond the warning window", () => {
    expect(service.classify(at("2026-11-04T00:00:00"), 30, now)).toBe("AMAN");
  });

  it("respects a per-product warning window", () => {
    const inFiveDays = at("2026-10-09T00:00:00");
    // Bread wants a short lead time, canned goods a long one.
    expect(service.classify(inFiveDays, 3, now)).toBe("AMAN");
    expect(service.classify(inFiveDays, 90, now)).toBe("MENDEKATI");
  });

  it("treats a negative warning window as zero rather than inverting", () => {
    expect(service.classify(at("2026-10-05T00:00:00"), -10, now)).toBe("AMAN");
    expect(service.classify(at("2026-10-04T00:00:00"), -10, now)).toBe("MENDEKATI");
  });
});

describe("ExpiryService.daysUntil", () => {
  it("compares whole days, not hours", () => {
    expect(service.daysUntil(at("2026-10-04T23:00:00"), now)).toBe(0);
    expect(service.daysUntil(at("2026-10-05T01:00:00"), now)).toBe(1);
    expect(service.daysUntil(at("2026-10-03T23:00:00"), now)).toBe(-1);
  });

  it("counts across a month boundary", () => {
    expect(service.daysUntil(at("2026-11-03T00:00:00"), now)).toBe(30);
  });
});

describe("ExpiryService.describe", () => {
  it("words each state briefly", () => {
    expect(service.describe("MENDEKATI", 0)).toBe("Hari ini");
    expect(service.describe("MENDEKATI", 1)).toBe("Besok");
    expect(service.describe("MENDEKATI", 5)).toBe("Sisa 5 hari");
    expect(service.describe("KEDALUWARSA", -1)).toBe("Lewat 1 hari");
    expect(service.describe("KEDALUWARSA", -4)).toBe("Lewat 4 hari");
    expect(service.describe("TIDAK_DIPANTAU", 0)).toBe("Tanggal kedaluwarsa belum diisi");
  });

  it("switches to months from 30 days, and drops a zero remainder", () => {
    expect(service.describe("MENDEKATI", 29)).toBe("Sisa 29 hari");
    expect(service.describe("AMAN", 30)).toBe("Sisa 1 bulan");
    expect(service.describe("AMAN", 35)).toBe("Sisa 1 bulan 5 hari");
    expect(service.describe("AMAN", 60)).toBe("Sisa 2 bulan");
    expect(service.describe("AMAN", 157)).toBe("Sisa 5 bulan 7 hari");
    expect(service.describe("AMAN", 400)).toBe("Sisa 13 bulan 10 hari");
  });

  it("words an expired item the same way", () => {
    expect(service.describe("KEDALUWARSA", -45)).toBe("Lewat 1 bulan 15 hari");
  });
});
