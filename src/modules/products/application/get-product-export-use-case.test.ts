import { describe, expect, it } from "vitest";
import { GetProductExportUseCase } from "./get-product-export-use-case";
import type { ProductListItem, ProductRepository } from "../repository/product-repository";

function product(over: Record<string, unknown>): ProductListItem {
  return {
    id: "p",
    sku: "SKU",
    name: "Produk",
    description: null,
    categoryId: null,
    category: null,
    productType: "PHYSICAL",
    serviceType: null,
    serviceProvider: null,
    baseUnit: "PCS",
    purchasePrice: "1000.00",
    sellingPrice: "1500.00",
    minimumStock: 5,
    expiryDate: null,
    expiryWarnDays: 30,
    currentStock: "10.000",
    trackInventory: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    barcodes: [],
    ...over,
  } as unknown as ProductListItem;
}

function repoOf(list: ProductListItem[]): ProductRepository {
  return { list: async () => list } as unknown as ProductRepository;
}

const NOW = new Date("2026-10-09T05:00:00Z");

describe("GetProductExportUseCase", () => {
  const list = [
    product({ id: "1", name: "Beras", sku: "BRS-1", currentStock: "20.000", purchasePrice: "60000.00", category: { name: "Sembako" },
      barcodes: [{ barcodeValue: "899111", status: "ACTIVE" }, { barcodeValue: "OLD1", status: "RETIRED" }] }),
    product({ id: "2", name: "Gula", sku: "GLA-1", currentStock: "3.000", minimumStock: 5, purchasePrice: "14000.00" }),
    product({ id: "3", name: "Kecap", sku: "KCP-1", currentStock: "0.000", purchasePrice: "9000.00" }),
    product({ id: "4", name: "Pulsa 10rb", sku: "PLS-10", productType: "SERVICE", serviceType: "PULSA", serviceProvider: "Telkomsel", currentStock: "0.000", purchasePrice: "9500.00", sellingPrice: "11000.00" }),
  ];

  it("values stock at purchase price and classifies it like the stock screen", async () => {
    const { rows, summary } = await new GetProductExportUseCase(repoOf(list)).execute("", NOW);
    expect(rows.map((r) => r.stockStatus)).toEqual(["AMAN", "MENIPIS", "HABIS"]);
    expect(rows[0].stockValue).toBe("1200000.00");
    expect(rows[1].stockValue).toBe("42000.00");
    expect(summary.totalStockValue).toBe("1242000.00");
    expect(summary.totalStock).toBe("23");
    expect(summary.lowCount).toBe(1);
    expect(summary.outCount).toBe(1);
  });

  it("moves services out of the stock table into a price list", async () => {
    const { rows, services, summary } = await new GetProductExportUseCase(repoOf(list)).execute("", NOW);
    expect(rows.map((r) => r.sku)).not.toContain("PLS-10");
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({ sku: "PLS-10", kind: "Pulsa", provider: "Telkomsel", purchasePrice: "9500.00", sellingPrice: "11000.00", margin: "1500.00" });
    expect(summary.physicalCount).toBe(3);
    expect(summary.serviceCount).toBe(1);
    expect(summary.productCount).toBe(4);
  });

  it("picks the active barcode and the category name", async () => {
    const { rows } = await new GetProductExportUseCase(repoOf(list)).execute("", NOW);
    expect(rows[0].barcode).toBe("899111");
    expect(rows[0].category).toBe("Sembako");
    expect(rows[1].category).toBe("-");
  });

  it("applies the same search as the screen", async () => {
    const byBarcode = await new GetProductExportUseCase(repoOf(list)).execute("899111", NOW);
    expect(byBarcode.rows.map((r) => r.sku)).toEqual(["BRS-1"]);
    const byName = await new GetProductExportUseCase(repoOf(list)).execute("gula", NOW);
    expect(byName.summary.productCount).toBe(1);
  });

  it("carries the last-changed time through to the export", async () => {
    const changed = new Date("2026-10-08T03:15:00Z");
    const { rows } = await new GetProductExportUseCase(repoOf([product({ updatedAt: changed })])).execute("", NOW);
    expect(rows[0].updatedAt).toEqual(changed);
  });

  it("describes expiry with the shared wording", async () => {
    const dated = product({ name: "Susu", expiryDate: new Date("2026-10-12T00:00:00Z") });
    const { rows } = await new GetProductExportUseCase(repoOf([dated])).execute("", NOW);
    expect(rows[0].expiryText).toBe("Sisa 3 hari");
  });
});
