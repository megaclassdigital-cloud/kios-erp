import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  movements: new Map<string, { id: string; productId: string; movementType: string; quantity: string; referenceType: string }>(),
  corrections: new Map<string, string[]>(), // movement id -> correction quantities
  stock: new Map<string, string>(),
  audits: [] as { action: string }[],
  recorded: [] as { quantity: string; referenceType: string; referenceId: string; movementType: string }[],
}));

vi.mock("@/shared/infrastructure/transaction-manager", () => ({
  TransactionManager: class {
    run<T>(work: (tx: unknown) => Promise<T>) {
      return work({});
    }
  },
}));
vi.mock("@/shared/infrastructure/audit-logger", () => ({
  AuditLogger: class {
    async record(e: { action: string }) {
      db.audits.push(e);
    }
  },
}));
vi.mock("@/modules/products/infrastructure/prisma-product-repository", () => ({
  PrismaProductRepository: class {
    async incrementStock(id: string, d: string) {
      db.stock.set(id, new Decimal(db.stock.get(id) ?? 0).plus(d).toString());
    }
    async decrementStockIfAvailable(id: string, q: string) {
      const now = new Decimal(db.stock.get(id) ?? 0);
      if (now.lt(q)) return false;
      db.stock.set(id, now.minus(q).toString());
      return true;
    }
    async findById(id: string) {
      return { name: "Shampoo", currentStock: db.stock.get(id) ?? "0" };
    }
  },
}));
vi.mock("../infrastructure/prisma-inventory-repository", () => ({
  PrismaInventoryRepository: class {
    async findMovement(id: string) {
      return db.movements.get(id) ?? null;
    }
    async sumStockInCorrections(id: string) {
      return (db.corrections.get(id) ?? []).reduce((s, q) => new Decimal(s).plus(q).toString(), "0");
    }
    async recordMovement(m: (typeof db.recorded)[number]) {
      db.recorded.push(m);
      if (m.referenceType === "STOCK_IN_EDIT") db.corrections.set(m.referenceId, [...(db.corrections.get(m.referenceId) ?? []), m.quantity]);
    }
  },
}));

import { DeleteStockInUseCase, StockInNotFoundError, UpdateStockInUseCase } from "./correct-stock-in-use-cases";

beforeEach(() => {
  db.movements.clear(); db.corrections.clear(); db.stock.clear(); db.audits.length = 0; db.recorded.length = 0;
  db.stock.set("p", "24");
  db.movements.set("m1", { id: "m1", productId: "p", movementType: "INITIAL_STOCK", quantity: "24", referenceType: "PRODUCT_INIT" });
});

describe("correcting a stock update (not a supplier receipt)", () => {
  it("edits initial stock 24 -> 30: stock +6 through a correction movement, original untouched", async () => {
    await new UpdateStockInUseCase().execute("m1", "30", "actor");
    expect(db.stock.get("p")).toBe("30");
    expect(db.movements.get("m1")!.quantity).toBe("24"); // the ledger row is never rewritten
    expect(db.recorded).toEqual([expect.objectContaining({ quantity: "6", referenceType: "STOCK_IN_EDIT", referenceId: "m1", movementType: "ADJUSTMENT" })]);
    expect(db.audits.map((a) => a.action)).toEqual(["STOCK_IN_UPDATED"]);
  });

  it("works from the effective quantity when edited twice (24 -> 30 -> 28)", async () => {
    await new UpdateStockInUseCase().execute("m1", "30", "a");
    await new UpdateStockInUseCase().execute("m1", "28", "a");
    expect(db.stock.get("p")).toBe("28");
    expect(db.recorded.map((r) => r.quantity)).toEqual(["6", "-2"]);
  });

  it("deletes by taking back the whole effective quantity", async () => {
    await new UpdateStockInUseCase().execute("m1", "30", "a");
    await new DeleteStockInUseCase().execute("m1", "a");
    expect(db.stock.get("p")).toBe("0");
    expect(db.recorded.map((r) => r.quantity)).toEqual(["6", "-30"]);
    expect(db.audits.map((a) => a.action)).toEqual(["STOCK_IN_UPDATED", "STOCK_IN_DELETED"]);
  });

  it("treats an already-deleted row as gone", async () => {
    await new DeleteStockInUseCase().execute("m1", "a");
    await expect(new DeleteStockInUseCase().execute("m1", "a")).rejects.toThrow(StockInNotFoundError);
    await expect(new UpdateStockInUseCase().execute("m1", "5", "a")).rejects.toThrow(/sudah dihapus/);
  });

  it("refuses to take back stock that was already sold, and changes nothing", async () => {
    db.stock.set("p", "10"); // 14 of the 24 already sold
    await expect(new DeleteStockInUseCase().execute("m1", "a")).rejects.toThrow(/tidak cukup/);
    await expect(new UpdateStockInUseCase().execute("m1", "5", "a")).rejects.toThrow(/tidak cukup/);
    expect(db.stock.get("p")).toBe("10");
    expect(db.recorded).toHaveLength(0);
    expect(db.audits).toHaveLength(0);
  });

  it("only touches stock updates: not receipts, corrections, outflows or unknown ids", async () => {
    db.movements.set("pur", { id: "pur", productId: "p", movementType: "PURCHASE", quantity: "5", referenceType: "PURCHASE" });
    db.movements.set("fix", { id: "fix", productId: "p", movementType: "ADJUSTMENT", quantity: "1", referenceType: "STOCK_IN_EDIT" });
    db.movements.set("rcpt", { id: "rcpt", productId: "p", movementType: "ADJUSTMENT", quantity: "1", referenceType: "PURCHASE_ITEM_EDIT" });
    db.movements.set("sale", { id: "sale", productId: "p", movementType: "SALE", quantity: "-1", referenceType: "SALE" });
    db.movements.set("ret", { id: "ret", productId: "p", movementType: "RETURN_IN", quantity: "1", referenceType: "REFUND" });
    for (const id of ["pur", "fix", "rcpt", "sale", "ret", "missing"]) {
      await expect(new DeleteStockInUseCase().execute(id, "a")).rejects.toThrow(StockInNotFoundError);
    }
    expect(db.stock.get("p")).toBe("24");
  });

  it("rejects zero, negative and non-numeric quantities", async () => {
    await expect(new UpdateStockInUseCase().execute("m1", "0", "a")).rejects.toThrow(/lebih dari 0/);
    await expect(new UpdateStockInUseCase().execute("m1", "-3", "a")).rejects.toThrow(/lebih dari 0/);
    await expect(new UpdateStockInUseCase().execute("m1", "abc", "a")).rejects.toThrow(/angka/);
  });
});
