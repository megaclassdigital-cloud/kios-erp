import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  effects: [] as { productId: string; net: string }[],
  stock: new Map<string, string>(),
  calls: [] as string[],
  audits: [] as { action: string; metadata?: unknown }[],
}));

vi.mock("@/shared/infrastructure/prisma", () => ({ prisma: {} }));
vi.mock("@/shared/infrastructure/transaction-manager", () => ({
  TransactionManager: class {
    run<T>(work: (tx: unknown) => Promise<T>) {
      return work({});
    }
  },
}));
vi.mock("@/shared/infrastructure/audit-logger", () => ({
  AuditLogger: class {
    async record(e: { action: string; metadata?: unknown }) {
      db.audits.push(e);
    }
  },
}));
vi.mock("@/modules/products/infrastructure/prisma-product-repository", () => ({
  PrismaProductRepository: class {
    async incrementStock(id: string, d: string) {
      db.calls.push(`restore:${id}:${d}`);
      db.stock.set(id, new Decimal(db.stock.get(id) ?? 0).plus(d).toString());
    }
  },
}));
vi.mock("../infrastructure/prisma-transaction-reset-repository", () => ({
  PrismaTransactionResetRepository: class {
    async count() {
      return { sales: 3, saleItems: 7, payments: 3, shifts: 1, stockMovements: 4, unitsToRestore: "9", numberCounters: 1 };
    }
    async stockEffects() {
      return db.effects;
    }
    async deleteSalesAndShifts() {
      db.calls.push("deleteSalesAndShifts");
    }
    async deleteSaleStockMovements() {
      db.calls.push("deleteSaleStockMovements");
    }
    async deleteTransactionCounters() {
      db.calls.push("deleteTransactionCounters");
    }
  },
}));

import { ResetTransactionDataUseCase } from "./transaction-reset-use-cases";
import { ResetNotConfirmedError } from "../domain/transaction-reset";

beforeEach(() => {
  db.effects = [{ productId: "a", net: "-5" }, { productId: "b", net: "-4" }];
  db.stock.clear(); db.stock.set("a", "95"); db.stock.set("b", "46");
  db.calls.length = 0; db.audits.length = 0;
});

describe("ResetTransactionDataUseCase", () => {
  it("refuses without the typed confirmation and deletes nothing", async () => {
    await expect(new ResetTransactionDataUseCase().execute({ confirmation: "ya", restoreStock: true, actorId: "o" })).rejects.toThrow(ResetNotConfirmedError);
    expect(db.calls).toEqual([]);
    expect(db.audits).toEqual([]);
  });

  it("puts sold stock back, removes the sale movements, then sales and shifts", async () => {
    const before = await new ResetTransactionDataUseCase().execute({ confirmation: "HAPUS TRANSAKSI", restoreStock: true, actorId: "o" });
    expect(db.stock.get("a")).toBe("100");
    expect(db.stock.get("b")).toBe("50");
    expect(db.calls).toEqual(["restore:a:5", "restore:b:4", "deleteSaleStockMovements", "deleteSalesAndShifts", "deleteTransactionCounters"]);
    expect(before.sales).toBe(3);
    expect(db.audits).toEqual([{ action: "TRANSACTION_DATA_RESET", entityType: "System", entityId: "transactions", beforeValue: before, metadata: { restoreStock: true }, actorId: "o" }]);
  });

  it("without restoring stock, keeps the movements so the ledger still matches the stock shown", async () => {
    await new ResetTransactionDataUseCase().execute({ confirmation: "hapus transaksi", restoreStock: false, actorId: "o" });
    expect(db.stock.get("a")).toBe("95");
    expect(db.calls).toEqual(["deleteSalesAndShifts", "deleteTransactionCounters"]);
    expect(db.audits[0].metadata).toEqual({ restoreStock: false });
  });
});
