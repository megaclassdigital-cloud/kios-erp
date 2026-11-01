import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  shift: { id: "sh1", cashierId: "u1" } as { id: string; cashierId: string } | null,
  sales: [] as unknown[],
}));

vi.mock("@/shared/infrastructure/prisma", () => ({ prisma: {} }));
vi.mock("../infrastructure/prisma-shift-repository", () => ({ PrismaShiftRepository: class { async findById() { return db.shift; } } }));
vi.mock("../infrastructure/prisma-sale-repository", () => ({ PrismaSaleRepository: class { async listByShift() { return db.sales; } } }));

import { ListShiftSalesUseCase, ShiftNotFoundError } from "./list-shift-sales-use-case";

const dec = (v: string) => ({ toString: () => v });
const sale = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  transactionNumber: "TRX-1",
  createdAt: new Date("2026-11-01T03:00:00Z"),
  paidAt: new Date("2026-11-01T03:00:00Z"),
  status: "PAID",
  paymentMethod: "CASH",
  subtotal: dec("7000"),
  discount: dec("0"),
  grandTotal: dec("7000"),
  cashReceived: dec("10000"),
  changeAmount: dec("3000"),
  cashier: { name: "Kasir A" },
  items: [{ productNameSnapshot: "Indomie", quantity: dec("2"), unitPriceAtSale: dec("3500"), discountAmount: dec("0"), promoType: null, promoValue: null, subtotal: dec("7000"), serviceDetail: null }],
  ...over,
});

describe("ListShiftSalesUseCase", () => {
  it("returns the shift's sales with their lines and a summary", async () => {
    db.shift = { id: "sh1", cashierId: "u1" };
    db.sales = [sale(), sale({ id: "s2", status: "PENDING", paymentMethod: "CASHLESS" })];
    const r = await new ListShiftSalesUseCase().execute("sh1", "u1", false);
    expect(r.sales).toHaveLength(2);
    expect(r.sales[0].items[0]).toMatchObject({ productNameSnapshot: "Indomie", quantity: "2", unitPriceAtSale: "3500", subtotal: "7000" });
    expect(r.summary).toMatchObject({ paidCount: 1, paidTotal: "7000.00", otherCount: 1, unitsSold: "2" });
  });

  it("keeps one cashier out of another's shift, but lets someone who monitors shifts in", async () => {
    db.shift = { id: "sh1", cashierId: "u1" };
    db.sales = [];
    await expect(new ListShiftSalesUseCase().execute("sh1", "u2", false)).rejects.toThrow();
    await expect(new ListShiftSalesUseCase().execute("sh1", "u2", true)).resolves.toBeTruthy();
  });

  it("says so when the shift does not exist", async () => {
    db.shift = null;
    await expect(new ListShiftSalesUseCase().execute("nope", "u1", false)).rejects.toThrow(ShiftNotFoundError);
  });
});
