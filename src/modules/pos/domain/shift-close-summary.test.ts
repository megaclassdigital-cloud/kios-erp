import { describe, expect, it } from "vitest";
import { buildShiftCloseSummary } from "./shift-close-summary";

const base = {
  shift: { revenue: "100000", cogs: "80000", transactions: 4 },
  day: { revenue: "250000.50", cogs: "190000", transactions: 11 },
  dayExpense: "20000",
};

describe("buildShiftCloseSummary", () => {
  it("gives omzet, gross and net profit for the shift and the day", () => {
    const s = buildShiftCloseSummary({ ...base, includeProfit: true });
    expect(s.shift).toEqual({ transactions: 4, omzet: "100000.00", grossProfit: "20000.00" });
    expect(s.day.omzet).toBe("250000.50");
    expect(s.day.grossProfit).toBe("60000.50");
    expect(s.day.expense).toBe("20000.00");
    expect(s.day.netProfit).toBe("40000.50");
  });

  it("hides every profit figure from a viewer who may not see profit", () => {
    const s = buildShiftCloseSummary({ ...base, includeProfit: false });
    expect(s.shift.grossProfit).toBeNull();
    expect(s.day.grossProfit).toBeNull();
    expect(s.day.expense).toBeNull();
    expect(s.day.netProfit).toBeNull();
    expect(s.day.omzet).toBe("250000.50");
  });

  it("can show a loss", () => {
    const s = buildShiftCloseSummary({ ...base, dayExpense: "100000", includeProfit: true });
    expect(s.day.netProfit).toBe("-39999.50");
  });
});
