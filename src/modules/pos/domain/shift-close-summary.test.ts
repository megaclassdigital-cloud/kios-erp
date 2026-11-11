import { describe, expect, it } from "vitest";
import { buildShiftCloseSummary } from "./shift-close-summary";

const base = {
  shift: { revenue: "100000", cogs: "80000", transactions: 4, cash: "60000", cashless: "40000" },
  day: { revenue: "250000.50", cogs: "190000", transactions: 11, cash: "150000.50", cashless: "100000" },
  dayExpense: "20000",
};

describe("buildShiftCloseSummary", () => {
  it("gives every Keuangan element for the shift and the day", () => {
    const s = buildShiftCloseSummary(base);
    expect(s.shift).toEqual({ transactions: 4, omzet: "100000.00", cogs: "80000.00", grossProfit: "20000.00", cash: "60000.00", cashless: "40000.00" });
    expect(s.day.omzet).toBe("250000.50");
    expect(s.day.cogs).toBe("190000.00");
    expect(s.day.grossProfit).toBe("60000.50");
    expect(s.day.expense).toBe("20000.00");
    expect(s.day.netProfit).toBe("40000.50");
    expect(s.day.cash).toBe("150000.50");
    expect(s.day.cashless).toBe("100000.00");
  });

  it("can show a loss", () => {
    expect(buildShiftCloseSummary({ ...base, dayExpense: "100000" }).day.netProfit).toBe("-39999.50");
  });
});
