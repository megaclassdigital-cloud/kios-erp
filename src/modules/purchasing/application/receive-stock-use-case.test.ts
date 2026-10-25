import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  stock: new Map<string, string>(),
  movements: [] as { quantity: string; movementType: string; referenceType: string; referenceId: string; note?: string }[],
  purchases: 0,
}));

vi.mock("@/shared/infrastructure/transaction-manager", () => ({
  TransactionManager: class {
    run<T>(work: (tx: unknown) => Promise<T>) {
      return work({});
    }
  },
}));
vi.mock("@/shared/infrastructure/audit-logger", () => ({ AuditLogger: class { async record() {} } }));
vi.mock("@/shared/infrastructure/daily-counter-repository", () => ({ DailyCounterRepository: class { async next() { return "PO-1"; } } }));
vi.mock("@/modules/products/infrastructure/prisma-product-repository", () => ({
  PrismaProductRepository: class {
    async incrementStock(id: string, d: string) {
      db.stock.set(id, new Decimal(db.stock.get(id) ?? 0).plus(d).toString());
    }
    async update() {}
  },
}));
vi.mock("@/modules/inventory/infrastructure/prisma-inventory-repository", () => ({
  PrismaInventoryRepository: class {
    async recordMovement(m: (typeof db.movements)[number]) {
      db.movements.push(m);
    }
  },
}));
vi.mock("../infrastructure/prisma-purchase-repository", () => ({
  PrismaPurchaseRepository: class {
    async create() {
      db.purchases += 1;
      return { id: "pur-1" };
    }
  },
}));

import { ReceiveStockUseCase } from "./receive-stock-use-case";

const base = { supplierId: "s", receivedById: "u" };

beforeEach(() => {
  db.stock.clear();
  db.movements.length = 0;
  db.purchases = 0;
  db.stock.set("p", "0");
});

describe("receiving with damaged goods", () => {
  it("45 received with 5 damaged leaves 40 and records both movements", async () => {
    await new ReceiveStockUseCase().execute({
      ...base,
      items: [{ productId: "p", quantity: "45", purchasePrice: "1000", damagedQuantity: "5" }],
    });
    expect(db.stock.get("p")).toBe("40");
    expect(db.movements.map((m) => [m.movementType, m.quantity, m.referenceType])).toEqual([
      ["PURCHASE", "45", "PURCHASE"],
      ["DAMAGE", "-5", "RECEIVE_DAMAGE"],
    ]);
  });

  it("without damaged units it behaves exactly as before", async () => {
    await new ReceiveStockUseCase().execute({ ...base, items: [{ productId: "p", quantity: "45", purchasePrice: "1000" }] });
    expect(db.stock.get("p")).toBe("45");
    expect(db.movements).toHaveLength(1);
  });

  it("refuses more damaged than received before writing anything", async () => {
    await expect(
      new ReceiveStockUseCase().execute({
        ...base,
        items: [{ productId: "p", quantity: "5", purchasePrice: "1000", damagedQuantity: "6" }],
      })
    ).rejects.toThrow(/tidak boleh lebih banyak/);
    expect(db.purchases).toBe(0);
    expect(db.movements).toHaveLength(0);
  });
});
