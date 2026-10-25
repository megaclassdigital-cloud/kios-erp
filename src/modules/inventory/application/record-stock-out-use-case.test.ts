import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  stock: new Map<string, string>(),
  products: new Map<string, { id: string; name: string; trackInventory: boolean; deletedAt: Date | null }>(),
  recorded: [] as { quantity: string; movementType: string; referenceType: string; note?: string }[],
  audits: [] as { action: string }[],
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
    async findById(id: string) {
      const p = db.products.get(id);
      return p ? { ...p, currentStock: db.stock.get(id) ?? "0" } : null;
    }
    async incrementStock(id: string, d: string) {
      db.stock.set(id, new Decimal(db.stock.get(id) ?? 0).plus(d).toString());
    }
    async decrementStockIfAvailable(id: string, q: string) {
      const now = new Decimal(db.stock.get(id) ?? 0);
      if (now.lt(q)) return false;
      db.stock.set(id, now.minus(q).toString());
      return true;
    }
  },
}));
vi.mock("../infrastructure/prisma-inventory-repository", () => ({
  PrismaInventoryRepository: class {
    async recordMovement(m: (typeof db.recorded)[number]) {
      db.recorded.push(m);
    }
  },
}));

import { RecordStockOutUseCase, StockOutProductNotFoundError } from "./record-stock-out-use-case";

beforeEach(() => {
  db.stock.clear();
  db.recorded.length = 0;
  db.audits.length = 0;
  db.products.clear();
  db.products.set("p", { id: "p", name: "Beras", trackInventory: true, deletedAt: null });
  db.stock.set("p", "45");
});

describe("RecordStockOutUseCase", () => {
  it("takes damaged goods off: 45 - 5 = 40, one DAMAGE movement of -5", async () => {
    await new RecordStockOutUseCase().execute({ productId: "p", quantity: "5", reason: "RUSAK", actorId: "u" });
    expect(db.stock.get("p")).toBe("40");
    expect(db.recorded).toEqual([expect.objectContaining({ quantity: "-5", movementType: "DAMAGE", referenceType: "STOCK_OUT" })]);
    expect(db.audits.map((a) => a.action)).toEqual(["STOCK_OUT_RECORDED"]);
  });

  it("refuses to go below zero and changes nothing", async () => {
    await expect(new RecordStockOutUseCase().execute({ productId: "p", quantity: "46", reason: "RUSAK", actorId: "u" })).rejects.toThrow(/tidak cukup/);
    expect(db.stock.get("p")).toBe("45");
    expect(db.recorded).toHaveLength(0);
  });

  it("refuses a service, a deleted product and an unknown id", async () => {
    db.products.set("svc", { id: "svc", name: "Pulsa", trackInventory: false, deletedAt: null });
    db.products.set("gone", { id: "gone", name: "Lama", trackInventory: true, deletedAt: new Date() });
    for (const productId of ["svc", "gone", "nope"]) {
      await expect(new RecordStockOutUseCase().execute({ productId, quantity: "1", reason: "RUSAK", actorId: "u" })).rejects.toThrow(StockOutProductNotFoundError);
    }
  });

  it("validates before touching stock", async () => {
    await expect(new RecordStockOutUseCase().execute({ productId: "p", quantity: "0", reason: "RUSAK", actorId: "u" })).rejects.toThrow(/lebih dari 0/);
    await expect(new RecordStockOutUseCase().execute({ productId: "p", quantity: "1", reason: "LAINNYA", actorId: "u" })).rejects.toThrow(/wajib dijelaskan/);
    expect(db.stock.get("p")).toBe("45");
  });
});
