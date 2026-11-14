import { describe, expect, it } from "vitest";
import { buildTransactionsSpec, buildFinanceSpecs } from "./report-specs";
import { buildA4Preview } from "@/shared/export/a4-preview";
import type { ReportContext } from "./report-data";

const ctx: ReportContext = {
  period: { label: "Hari Ini", start: new Date("2026-11-13T17:00:00Z"), end: new Date("2026-11-14T16:59:59Z") },
  printedBy: "Owner",
  printedAt: new Date("2026-11-14T01:20:00Z"),
};

describe("transactions sheet", () => {
  const at = new Date("2026-11-14T01:05:00Z"); // 08:05 WIB
  const sheet = () =>
    buildTransactionsSpec(
      [
        { number: "TRX-1", at, cashier: "Owner", method: "CASH", status: "PAID", items: [{ name: "Kopi", quantity: 2, unitPrice: 3000, discount: 500 }, { name: "Gula", quantity: 1, unitPrice: 15000, discount: 0 }] },
        { number: "TRX-2", at, cashier: "Owner", method: "CASHLESS", status: "REFUNDED", items: [{ name: "Susu", quantity: 1, unitPrice: 9000, discount: 0 }] },
      ],
      ctx,
      "Semua kasir"
    );

  it("lists one row per item with name and price, time in WIB", () => {
    const [s] = buildA4Preview(sheet());
    expect(s.rows).toHaveLength(3);
    expect(s.rows[0][0]).toBe("14/11/2026 08:05");
    expect(s.rows[0][3]).toBe("Kopi");
    expect(s.rows[0][5]).toBe("Rp3.000");
    expect(s.rows[0][7]).toBe("Rp5.500");
  });

  it("totals only paid sales", () => {
    const [s] = buildA4Preview(sheet());
    expect(s.totals[0][7]).toBe("Rp20.500");
  });
});

describe("finance sheets", () => {
  it("derives gross and net profit the way Keuangan does", () => {
    const [summary] = buildA4Preview(
      buildFinanceSpecs({ transactions: 3, revenue: 100000, cogs: 70000, expense: 10000, cash: 60000, cashless: 40000, products: [], expenses: [] }, ctx)
    );
    const byLabel = Object.fromEntries(summary.rows.map((r) => [r[0], r[1]]));
    expect(byLabel["Untung Kotor (Omzet - Modal)"]).toBe("Rp30.000");
    expect(byLabel["Untung Bersih (Untung Kotor - Pengeluaran)"]).toBe("Rp20.000");
  });
});
