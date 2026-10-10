import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the database, so the orchestration (stock moves,
// ledger rows, receipt totals, audit) is tested end to end without Postgres.
const db = vi.hoisted(() => ({
  items: new Map<string, { id: string; purchaseId: string; productId: string; quantity: string; purchasePrice: string; subtotal: string; expiryDate: Date | null; order: number }>(),
  purchases: new Map<string, { number: string; total: string }>(),
  stock: new Map<string, string>(),
  productExpiry: new Map<string, Date | null>(),
  movements: [] as { productId: string; quantity: string; movementType: string; referenceType: string; referenceId: string }[],
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
    async incrementStock(id: string, delta: string) {
      db.stock.set(id, new Decimal(db.stock.get(id) ?? 0).plus(delta).toString());
    }
    async decrementStockIfAvailable(id: string, qty: string) {
      const now = new Decimal(db.stock.get(id) ?? 0);
      if (now.lt(qty)) return false;
      db.stock.set(id, now.minus(qty).toString());
      return true;
    }
    async findById(id: string) {
      return { currentStock: db.stock.get(id) ?? "0" };
    }
    async update(id: string, data: { expiryDate?: Date | null }) {
      if (data.expiryDate !== undefined) db.productExpiry.set(id, data.expiryDate);
    }
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
    async findItem(id: string) {
      const i = db.items.get(id);
      if (!i) return null;
      return { ...i, purchaseNumber: db.purchases.get(i.purchaseId)!.number, purchaseStatus: "CONFIRMED", productName: "Beras" };
    }
    async updateItem(id: string, data: Partial<{ quantity: string; purchasePrice: string; subtotal: string; expiryDate: Date | null }>) {
      Object.assign(db.items.get(id)!, data);
    }
    async deleteItem(id: string) {
      db.items.delete(id);
    }
    async itemSubtotals(purchaseId: string) {
      return [...db.items.values()].filter((i) => i.purchaseId === purchaseId).map((i) => i.subtotal);
    }
    async setTotal(purchaseId: string, total: string) {
      db.purchases.get(purchaseId)!.total = total;
    }
    async deletePurchase(purchaseId: string) {
      db.purchases.delete(purchaseId);
    }
    async latestItemForProduct(productId: string) {
      const latest = [...db.items.values()].filter((i) => i.productId === productId).sort((a, b) => b.order - a.order)[0];
      return latest ? { id: latest.id, expiryDate: latest.expiryDate } : null;
    }
  },
}));

import { DeleteReceivedItemUseCase, ReceivedItemNotFoundError, UpdateReceivedItemUseCase } from "./correct-received-item-use-cases";

function seed() {
  db.items.clear(); db.purchases.clear(); db.stock.clear(); db.productExpiry.clear();
  db.movements.length = 0; db.audits.length = 0;
  db.purchases.set("po1", { number: "PO-1", total: "5000.00" });
  // Stock was 100, then 5 were received -> 105.
  db.stock.set("prod", "105");
  db.items.set("it1", { id: "it1", purchaseId: "po1", productId: "prod", quantity: "5", purchasePrice: "1000.00", subtotal: "5000.00", expiryDate: new Date("2027-01-31"), order: 1 });
}

describe("correcting a received line", () => {
  beforeEach(seed);

  it("puts stock up by the difference when 5 becomes 6", async () => {
    await new UpdateReceivedItemUseCase().execute("it1", { quantity: "6" }, "actor");
    expect(db.stock.get("prod")).toBe("106");
    expect(db.items.get("it1")).toMatchObject({ quantity: "6", subtotal: "6000.00" });
    expect(db.purchases.get("po1")!.total).toBe("6000.00");
    expect(db.movements).toEqual([
      expect.objectContaining({ productId: "prod", quantity: "1", movementType: "ADJUSTMENT", referenceType: "PURCHASE_ITEM_EDIT", referenceId: "it1" }),
    ]);
    expect(db.audits.map((a) => a.action)).toEqual(["PURCHASE_ITEM_UPDATED"]);
  });

  it("takes the whole 6 back when the corrected line is then deleted", async () => {
    await new UpdateReceivedItemUseCase().execute("it1", { quantity: "6" }, "actor");
    await new DeleteReceivedItemUseCase().execute("it1", "actor");
    expect(db.stock.get("prod")).toBe("100");
    expect(db.items.has("it1")).toBe(false);
    expect(db.purchases.has("po1")).toBe(false); // no lines left -> receipt removed
    // ledger nets to zero for this receipt: +1 (edit) and -6 (delete) on top of the original +5
    expect(db.movements.map((m) => m.quantity)).toEqual(["1", "-6"]);
  });

  it("changes only the price without touching stock", async () => {
    await new UpdateReceivedItemUseCase().execute("it1", { purchasePrice: "1200" }, "actor");
    expect(db.stock.get("prod")).toBe("105");
    expect(db.movements).toHaveLength(0);
    expect(db.items.get("it1")!.subtotal).toBe("6000.00");
    expect(db.purchases.get("po1")!.total).toBe("6000.00");
  });

  it("refuses to lower stock below what is left, and changes nothing", async () => {
    db.stock.set("prod", "2"); // most of it was already sold
    await expect(new UpdateReceivedItemUseCase().execute("it1", { quantity: "1" }, "actor")).rejects.toThrow(/tidak cukup/);
    expect(db.stock.get("prod")).toBe("2");
    expect(db.movements).toHaveLength(0);
  });

  it("does not delete a line whose stock cannot be taken back", async () => {
    db.stock.set("prod", "3");
    await expect(new DeleteReceivedItemUseCase().execute("it1", "actor")).rejects.toThrow(/tidak cukup/);
    expect(db.items.has("it1")).toBe(true);
    expect(db.stock.get("prod")).toBe("3");
    expect(db.audits).toHaveLength(0);
  });

  it("keeps a receipt with other lines and recomputes its total", async () => {
    db.items.set("it2", { id: "it2", purchaseId: "po1", productId: "other", quantity: "2", purchasePrice: "500.00", subtotal: "1000.00", expiryDate: null, order: 2 });
    db.stock.set("other", "10");
    db.purchases.get("po1")!.total = "6000.00";
    await new DeleteReceivedItemUseCase().execute("it1", "actor");
    expect(db.purchases.get("po1")!.total).toBe("1000.00");
    expect(db.stock.get("other")).toBe("10");
  });

  it("updates the product's expiry only when the latest delivery is corrected", async () => {
    db.items.set("it2", { id: "it2", purchaseId: "po1", productId: "prod", quantity: "1", purchasePrice: "1000.00", subtotal: "1000.00", expiryDate: new Date("2027-06-30"), order: 2 });
    await new UpdateReceivedItemUseCase().execute("it1", { expiryDate: new Date("2027-02-28") }, "actor");
    expect(db.productExpiry.has("prod")).toBe(false); // it1 is not the latest
    await new UpdateReceivedItemUseCase().execute("it2", { expiryDate: new Date("2027-07-31") }, "actor");
    expect(db.productExpiry.get("prod")).toEqual(new Date("2027-07-31"));
  });

  it("falls back to the previous delivery's date when the latest is deleted", async () => {
    db.items.set("it2", { id: "it2", purchaseId: "po1", productId: "prod", quantity: "1", purchasePrice: "1000.00", subtotal: "1000.00", expiryDate: new Date("2027-06-30"), order: 2 });
    await new DeleteReceivedItemUseCase().execute("it2", "actor");
    expect(db.productExpiry.get("prod")).toEqual(new Date("2027-01-31"));
  });

  it("rejects an unknown line and invalid numbers", async () => {
    await expect(new UpdateReceivedItemUseCase().execute("nope", { quantity: "2" }, "a")).rejects.toThrow(ReceivedItemNotFoundError);
    await expect(new UpdateReceivedItemUseCase().execute("it1", { quantity: "0" }, "a")).rejects.toThrow(/lebih dari 0/);
    await expect(new DeleteReceivedItemUseCase().execute("nope", "a")).rejects.toThrow(ReceivedItemNotFoundError);
  });
});
