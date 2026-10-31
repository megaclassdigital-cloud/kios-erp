import { describe, expect, it } from "vitest";
import { cleanExpense, InvalidExpenseError } from "./expense";

const now = new Date("2026-11-01T00:00:00Z");
const base = { category: "OPERATIONAL" as const, amount: "49603", description: "  Label harga ", expenseDate: "2026-10-31T01:00:00Z" };

describe("cleanExpense", () => {
  it("tidies a valid expense", () => {
    expect(cleanExpense(base, undefined, now)).toMatchObject({ amount: "49603.00", description: "Label harga", category: "OPERATIONAL" });
  });

  it("rejects bad amounts, dates and descriptions", () => {
    const bad = (over: object) => () => cleanExpense({ ...base, ...over }, undefined, now);
    expect(bad({ amount: "0" })).toThrow(/lebih dari 0/);
    expect(bad({ amount: "-5" })).toThrow(InvalidExpenseError);
    expect(bad({ amount: "abc" })).toThrow(/angka/);
    expect(bad({ amount: "1.234" })).toThrow(/2 angka/);
    expect(bad({ expenseDate: "x" })).toThrow(/Tanggal/);
    expect(bad({ expenseDate: "2027-01-01" })).toThrow(/masa depan/);
    expect(bad({ description: "x".repeat(301) })).toThrow(/300/);
  });

  it("never lets anything be switched to SUPPLIER, but lets an old SUPPLIER record stay", () => {
    expect(() => cleanExpense({ ...base, category: "SUPPLIER" }, undefined, now)).toThrow(/Kategori/);
    expect(() => cleanExpense({ ...base, category: "SUPPLIER" }, "OPERATIONAL", now)).toThrow(/Kategori/);
    expect(cleanExpense({ ...base, category: "SUPPLIER" }, "SUPPLIER", now).category).toBe("SUPPLIER");
  });
});
