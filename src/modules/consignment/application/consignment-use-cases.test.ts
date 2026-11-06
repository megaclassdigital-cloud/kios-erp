import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Prod = { id: string; name: string; active: boolean; trackInventory: boolean; isConsignment: boolean; consignorId: string | null; purchasePrice: string; sellingPrice: string; currentStock: string; deletedAt: null };

const db = vi.hoisted(() => ({
  products: new Map<string, unknown>(),
  movements: [] as { quantity: string; movementType: string; referenceType: string }[],
  consignments: [] as { id: string; number: string }[],
  items: new Map<string, { id: string; consignmentId: string; productId: string; quantity: string; quantityReturned: string; consignment: { number: string }; product: { name: string; currentStock: string } }>(),
  payments: [] as { amount: string }[],
  audits: [] as string[],
  position: null as null | object,
  catchUps: [] as { productId: string; quantity: string }[],
}));

vi.mock("@/shared/infrastructure/prisma", () => ({ prisma: {} }));
vi.mock("@/shared/infrastructure/transaction-manager", () => ({ TransactionManager: class { run<T>(w: (tx: unknown) => Promise<T>) { return w({}); } } }));
vi.mock("@/shared/infrastructure/audit-logger", () => ({ AuditLogger: class { async record(e: { action: string }) { db.audits.push(e.action); } } }));
vi.mock("@/shared/infrastructure/daily-counter-repository", () => ({ DailyCounterRepository: class { async next() { return "TTP-20261106-000001"; } } }));
vi.mock("@/modules/products/infrastructure/prisma-product-repository", () => ({
  PrismaProductRepository: class {
    async findByIds(ids: string[]) { return ids.flatMap((id) => (db.products.has(id) ? [db.products.get(id)] : [])); }
    async findById(id: string) { return db.products.get(id) ?? null; }
    async incrementStock(id: string, d: string) { const p = db.products.get(id) as Prod; p.currentStock = new Decimal(p.currentStock).plus(d).toString(); }
    async decrementStockIfAvailable(id: string, q: string) {
      const p = db.products.get(id) as Prod;
      if (new Decimal(p.currentStock).lt(q)) return false;
      p.currentStock = new Decimal(p.currentStock).minus(q).toString();
      return true;
    }
    async update(id: string, d: { purchasePrice?: string }) { Object.assign(db.products.get(id) as Prod, d); }
  },
}));
vi.mock("@/modules/inventory/infrastructure/prisma-inventory-repository", () => ({ PrismaInventoryRepository: class { async recordMovement(m: (typeof db.movements)[number]) { db.movements.push(m); } } }));
vi.mock("../infrastructure/prisma-consignment-repository", () => ({
  PrismaConsignmentRepository: class {
    async findSupplier(id: string) { return id === "s1" ? { id: "s1", name: "Sales Roti", active: true } : null; }
    async createConsignment(d: { number: string }) { const c = { id: `c${db.consignments.length + 1}`, number: d.number }; db.consignments.push(c); return c; }
    async findItem(id: string) { return db.items.get(id) ?? null; }
    async addReturned(id: string, q: string) { const i = db.items.get(id)!; i.quantityReturned = new Decimal(i.quantityReturned).plus(q).toString(); }
    async createPayment(d: { amount: string }) { db.payments.push(d); return { id: "pay1" }; }
    async positionData() { return db.position; }
    async findConsignmentProduct(id: string) { const p = db.products.get(id) as Prod | undefined; return p?.isConsignment && p.consignorId ? p : null; }
    async createCatchUp(d: { productId: string; quantity: string }) { db.catchUps.push(d); return { id: "cu1" }; }
  },
}));

import { PayConsignorUseCase, RecordCatchUpSaleUseCase, ReceiveConsignmentUseCase, ReturnConsignmentItemUseCase } from "./consignment-use-cases";

const product = (over: Partial<Prod> = {}): Prod => ({ id: "p1", name: "Roti Tawar", active: true, trackInventory: true, isConsignment: true, consignorId: "s1", purchasePrice: "8000", sellingPrice: "12000", currentStock: "0", deletedAt: null, ...over });

beforeEach(() => {
  db.products.clear(); db.movements.length = 0; db.consignments.length = 0; db.items.clear(); db.payments.length = 0; db.audits.length = 0; db.catchUps.length = 0;
  db.products.set("p1", product());
});

describe("receiving a drop-off", () => {
  it("raises stock through the ledger, adopts the consignor's price, and books no expense", async () => {
    const { warnings } = await new ReceiveConsignmentUseCase().execute({ supplierId: "s1", actorId: "u", lines: [{ productId: "p1", quantity: "20", unitCost: "9000" }] });
    const p = db.products.get("p1") as Prod;
    expect(p.currentStock).toBe("20");
    expect(p.purchasePrice).toBe("9000.00"); // sales will now carry the right cost
    expect(db.movements).toEqual([expect.objectContaining({ quantity: "20", movementType: "PURCHASE", referenceType: "CONSIGNMENT" })]);
    expect(db.audits).toEqual(["CONSIGNMENT_RECEIVED"]);
    expect(warnings).toEqual([]);
  });

  it("warns when the selling price does not clear the consignor's price", async () => {
    const { warnings } = await new ReceiveConsignmentUseCase().execute({ supplierId: "s1", actorId: "u", lines: [{ productId: "p1", quantity: "5", unitCost: "12000" }] });
    expect(warnings[0]).toContain("Roti Tawar");
  });

  it("refuses a product that is not marked as consignment, or belongs to another consignor, and changes nothing", async () => {
    db.products.set("p2", product({ id: "p2", name: "Beras", isConsignment: false, consignorId: null }));
    db.products.set("p3", product({ id: "p3", name: "Donat", consignorId: "s9" }));
    const run = (productId: string) => new ReceiveConsignmentUseCase().execute({ supplierId: "s1", actorId: "u", lines: [{ productId, quantity: "1", unitCost: "100" }] });
    await expect(run("p2")).rejects.toThrow(/belum ditandai sebagai barang titipan/);
    await expect(run("p3")).rejects.toThrow(/penitip lain/);
    expect(db.movements).toHaveLength(0);
    expect(db.consignments).toHaveLength(0);
  });

  it("refuses an unknown consignor", async () => {
    await expect(new ReceiveConsignmentUseCase().execute({ supplierId: "nope", actorId: "u", lines: [{ productId: "p1", quantity: "1", unitCost: "100" }] })).rejects.toThrow(/Penitip/);
  });
});

describe("returning unsold units", () => {
  const item = (stock: string, returned = "0") => ({ id: "i1", consignmentId: "c1", productId: "p1", quantity: "20", quantityReturned: returned, consignment: { number: "TTP-1" }, product: { name: "Roti Tawar", currentStock: stock } });

  it("takes the units off the shelf as RETURN_OUT and records them on the line", async () => {
    (db.products.get("p1") as Prod).currentStock = "12";
    db.items.set("i1", item("12"));
    await new ReturnConsignmentItemUseCase().execute("i1", "5", "u");
    expect((db.products.get("p1") as Prod).currentStock).toBe("7");
    expect(db.items.get("i1")!.quantityReturned).toBe("5");
    expect(db.movements).toEqual([expect.objectContaining({ quantity: "-5", movementType: "RETURN_OUT", referenceType: "CONSIGNMENT_RETURN" })]);
  });

  it("will not return more than is left on the shelf (the rest was sold)", async () => {
    (db.products.get("p1") as Prod).currentStock = "3";
    db.items.set("i1", item("3"));
    await expect(new ReturnConsignmentItemUseCase().execute("i1", "5", "u")).rejects.toThrow(/Hanya 3 unit/);
    expect(db.movements).toHaveLength(0);
  });
});

describe("paying a consignor", () => {
  const position = (soldCost: string, paid: string) => ({
    consignors: [{ id: "s1", name: "Sales Roti" }],
    products: [{ id: "p1", name: "Roti Tawar", consignorId: "s1", currentStock: "10", sellingPrice: "12000", purchasePrice: "9000" }],
    items: [{ productId: "p1", consignorId: "s1", quantity: "20", quantityReturned: "0", unitCost: "9000", droppedAt: new Date("2026-11-01") }],
    saleLines: [{ productId: "p1", consignorId: "s1", quantity: new Decimal(soldCost).div(9000).toString(), costPriceAtSale: "9000", revenue: "10800", paidAt: new Date("2026-11-02") }],
    payments: [{ consignorId: "s1", amount: paid }],
  });

  it("pays up to the balance and records it", async () => {
    db.position = position("90000", "30000"); // owes 60.000
    await new PayConsignorUseCase().execute({ supplierId: "s1", amount: "60000", actorId: "u" });
    expect(db.payments).toEqual([expect.objectContaining({ amount: "60000.00" })]);
    expect(db.audits).toEqual(["CONSIGNMENT_PAID"]);
  });

  it("refuses to overpay", async () => {
    db.position = position("90000", "30000");
    await expect(new PayConsignorUseCase().execute({ supplierId: "s1", amount: "60001", actorId: "u" })).rejects.toThrow(/melebihi utang/);
    expect(db.payments).toHaveLength(0);
  });
});

describe("catching up a sale that was never rung up", () => {
  it("takes the units off the shelf as a SALE movement and adds them to what is owed", async () => {
    (db.products.get("p1") as Prod).currentStock = "10";
    const r = await new RecordCatchUpSaleUseCase().execute({ productId: "p1", quantity: "4", actorId: "u" });
    expect((db.products.get("p1") as Prod).currentStock).toBe("6");
    expect(db.movements).toEqual([expect.objectContaining({ quantity: "-4", movementType: "SALE", referenceType: "CONSIGNMENT_CATCHUP" })]);
    expect(db.catchUps).toEqual([expect.objectContaining({ productId: "p1", quantity: "4" })]);
    expect(r.owed).toBe("32000.00");
  });

  it("refuses more than is on the shelf and records nothing on the stock side", async () => {
    (db.products.get("p1") as Prod).currentStock = "2";
    await expect(new RecordCatchUpSaleUseCase().execute({ productId: "p1", quantity: "5", actorId: "u" })).rejects.toThrow(/tidak cukup/);
    expect(db.movements).toHaveLength(0);
  });

  it("rejects a product that is not consignment goods", async () => {
    db.products.set("p2", product({ id: "p2", isConsignment: false, consignorId: null }));
    await expect(new RecordCatchUpSaleUseCase().execute({ productId: "p2", quantity: "1", actorId: "u" })).rejects.toThrow(/tidak ditemukan/);
  });

  it("rejects zero and non-numeric quantities", async () => {
    await expect(new RecordCatchUpSaleUseCase().execute({ productId: "p1", quantity: "0", actorId: "u" })).rejects.toThrow(/lebih dari 0/);
    await expect(new RecordCatchUpSaleUseCase().execute({ productId: "p1", quantity: "abc", actorId: "u" })).rejects.toThrow(/angka/);
  });
});
