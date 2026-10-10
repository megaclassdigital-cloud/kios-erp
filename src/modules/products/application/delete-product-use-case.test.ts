import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  product: null as null | Record<string, unknown>,
  updates: [] as Record<string, unknown>[],
  retired: [] as string[],
  audits: [] as { action: string; metadata?: unknown }[],
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
    async record(e: { action: string; metadata?: unknown }) {
      db.audits.push(e);
    }
  },
}));
vi.mock("../infrastructure/prisma-product-repository", () => ({
  PrismaProductRepository: class {
    async findById() {
      return db.product;
    }
    async update(_id: string, data: Record<string, unknown>) {
      db.updates.push(data);
    }
  },
}));
vi.mock("../infrastructure/prisma-barcode-repository", () => ({
  PrismaBarcodeRepository: class {
    async retire(id: string) {
      db.retired.push(id);
    }
  },
}));

import { DeleteProductUseCase } from "./delete-product-use-case";
import { ProductNotFoundError } from "./update-product-use-case";

beforeEach(() => {
  db.updates.length = 0; db.retired.length = 0; db.audits.length = 0;
  db.product = {
    id: "p", name: "Beras", sku: "BRS-1", productType: "PHYSICAL", currentStock: "0.000",
    purchasePrice: "60000.00", sellingPrice: "65000.00", deletedAt: null,
    barcodes: [
      { id: "b1", barcodeValue: "899111", status: "ACTIVE" },
      { id: "b2", barcodeValue: "OLD", status: "RETIRED" },
    ],
  };
});

describe("DeleteProductUseCase", () => {
  it("soft-deletes: stamps and deactivates the row, retires only active barcodes, audits", async () => {
    await new DeleteProductUseCase().execute("p", "actor");
    expect(db.updates).toEqual([{ deletedAt: expect.any(Date), active: false }]);
    expect(db.retired).toEqual(["b1"]);
    expect(db.audits).toEqual([expect.objectContaining({ action: "PRODUCT_DELETED", metadata: { retiredBarcodes: ["899111"] } })]);
  });

  it("refuses while stock remains and changes nothing", async () => {
    db.product!.currentStock = "3.000";
    await expect(new DeleteProductUseCase().execute("p", "actor")).rejects.toThrow(/masih 3/);
    expect(db.updates).toHaveLength(0);
    expect(db.retired).toHaveLength(0);
    expect(db.audits).toHaveLength(0);
  });

  it("deletes a service without any stock check", async () => {
    db.product = { ...db.product!, productType: "SERVICE", currentStock: "0", barcodes: [] };
    await new DeleteProductUseCase().execute("p", "actor");
    expect(db.updates).toHaveLength(1);
  });

  it("treats a missing or already-deleted product as not found", async () => {
    db.product = null;
    await expect(new DeleteProductUseCase().execute("p", "a")).rejects.toThrow(ProductNotFoundError);
    db.product = { id: "p", deletedAt: new Date(), barcodes: [] };
    await expect(new DeleteProductUseCase().execute("p", "a")).rejects.toThrow(ProductNotFoundError);
  });
});
