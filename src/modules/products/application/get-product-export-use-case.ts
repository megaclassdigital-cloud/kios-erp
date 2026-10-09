import Decimal from "decimal.js";
import { prisma } from "@/shared/infrastructure/prisma";
import { InventoryService, type StockStatus } from "@/modules/inventory/domain/inventory-service";
import { ExpiryService } from "@/modules/inventory/domain/expiry-service";
import { PrismaProductRepository } from "../infrastructure/prisma-product-repository";
import { filterProducts } from "../domain/product-filter";
import type { ProductRepository } from "../repository/product-repository";

export interface ProductExportRow {
  name: string;
  sku: string;
  category: string;
  productType: "PHYSICAL" | "SERVICE";
  barcode: string;
  unit: string;
  /** Null for a service, which carries no stock. */
  stock: string | null;
  minimumStock: number | null;
  stockStatus: StockStatus | null;
  purchasePrice: string;
  sellingPrice: string;
  /** Stock x purchase price; null when there is no stock to value. */
  stockValue: string | null;
  expiryDate: Date | null;
  expiryText: string;
  active: boolean;
}

export interface ProductExport {
  rows: ProductExportRow[];
  summary: {
    productCount: number;
    physicalCount: number;
    totalStock: string;
    totalStockValue: string;
    lowCount: number;
    outCount: number;
  };
}

/**
 * Master Produk as a flat export. Starts from the same repository list the
 * screen loads and applies the same search rule, so a download of "what I am
 * looking at" is exactly those rows, with the live stock the screen shows.
 */
export class GetProductExportUseCase {
  constructor(private readonly products: ProductRepository = new PrismaProductRepository(prisma)) {}

  async execute(search: string, now = new Date()): Promise<ProductExport> {
    const inventory = new InventoryService();
    const expiry = new ExpiryService();
    const list = filterProducts(await this.products.list({}), search);

    let totalStock = new Decimal(0);
    let totalStockValue = new Decimal(0);
    let lowCount = 0;
    let outCount = 0;
    let physicalCount = 0;

    const rows = list.map((p): ProductExportRow => {
      const isService = p.productType === "SERVICE";
      const stockStatus = isService ? null : inventory.classifyStock(Number(p.currentStock), p.minimumStock);
      const stockValue = isService ? null : new Decimal(p.currentStock.toString()).times(p.purchasePrice.toString());

      if (!isService) {
        physicalCount += 1;
        totalStock = totalStock.plus(p.currentStock.toString());
        totalStockValue = totalStockValue.plus(stockValue as Decimal);
        if (stockStatus === "MENIPIS") lowCount += 1;
        if (stockStatus === "HABIS") outCount += 1;
      }

      const status = isService ? "TIDAK_DIPANTAU" : expiry.classify(p.expiryDate, p.expiryWarnDays, now);
      const expiryText = isService
        ? "-"
        : status === "TIDAK_DIPANTAU"
          ? "Belum diisi"
          : expiry.describe(status, expiry.daysUntil(p.expiryDate as Date, now));

      return {
        name: p.name,
        sku: p.sku,
        category: p.category?.name ?? "-",
        productType: p.productType,
        barcode: p.barcodes.find((b) => b.status === "ACTIVE")?.barcodeValue ?? "-",
        unit: p.baseUnit,
        stock: isService ? null : p.currentStock.toString(),
        minimumStock: isService ? null : p.minimumStock,
        stockStatus,
        purchasePrice: p.purchasePrice.toString(),
        sellingPrice: p.sellingPrice.toString(),
        stockValue: stockValue ? stockValue.toFixed(2) : null,
        expiryDate: isService ? null : p.expiryDate,
        expiryText,
        active: p.active,
      };
    });

    return {
      rows,
      summary: {
        productCount: rows.length,
        physicalCount,
        totalStock: totalStock.toString(),
        totalStockValue: totalStockValue.toFixed(2),
        lowCount,
        outCount,
      },
    };
  }
}
