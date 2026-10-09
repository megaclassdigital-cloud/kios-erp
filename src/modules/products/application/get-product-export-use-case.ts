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
  barcode: string;
  unit: string;
  stock: string;
  minimumStock: number;
  stockStatus: StockStatus;
  purchasePrice: string;
  sellingPrice: string;
  /** Stock x purchase price. */
  stockValue: string;
  expiryDate: Date | null;
  expiryText: string;
  active: boolean;
  /** Last change of any kind (stock or data), same value as the screen shows. */
  updatedAt: Date;
}

/** A service (pulsa, token listrik): no stock, so it is listed as a price
 * list rather than as a stock row. */
export interface ServicePriceRow {
  name: string;
  sku: string;
  kind: string;
  provider: string;
  purchasePrice: string;
  sellingPrice: string;
  margin: string;
  active: boolean;
  updatedAt: Date;
}

export interface ProductExport {
  /** Physical goods, with stock. */
  rows: ProductExportRow[];
  /** Services, as a price list. */
  services: ServicePriceRow[];
  summary: {
    productCount: number;
    physicalCount: number;
    serviceCount: number;
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

    const physical = list.filter((p) => p.productType !== "SERVICE");
    const services = list
      .filter((p) => p.productType === "SERVICE")
      .map(
        (p): ServicePriceRow => ({
          name: p.name,
          sku: p.sku,
          kind: p.serviceType === "TOKEN_LISTRIK" ? "Token Listrik" : p.serviceType === "PULSA" ? "Pulsa" : "Layanan",
          provider: p.serviceProvider ?? "-",
          purchasePrice: p.purchasePrice.toString(),
          sellingPrice: p.sellingPrice.toString(),
          margin: new Decimal(p.sellingPrice.toString()).minus(p.purchasePrice.toString()).toFixed(2),
          active: p.active,
          updatedAt: p.updatedAt,
        })
      );

    const rows = physical.map((p): ProductExportRow => {
      const stockStatus = inventory.classifyStock(Number(p.currentStock), p.minimumStock);
      const stockValue = new Decimal(p.currentStock.toString()).times(p.purchasePrice.toString());

      totalStock = totalStock.plus(p.currentStock.toString());
      totalStockValue = totalStockValue.plus(stockValue);
      if (stockStatus === "MENIPIS") lowCount += 1;
      if (stockStatus === "HABIS") outCount += 1;

      const status = expiry.classify(p.expiryDate, p.expiryWarnDays, now);
      const expiryText =
        status === "TIDAK_DIPANTAU"
          ? "Belum diisi"
          : expiry.describe(status, expiry.daysUntil(p.expiryDate as Date, now));

      return {
        name: p.name,
        sku: p.sku,
        category: p.category?.name ?? "-",
        barcode: p.barcodes.find((b) => b.status === "ACTIVE")?.barcodeValue ?? "-",
        unit: p.baseUnit,
        stock: p.currentStock.toString(),
        minimumStock: p.minimumStock,
        stockStatus,
        purchasePrice: p.purchasePrice.toString(),
        sellingPrice: p.sellingPrice.toString(),
        stockValue: stockValue.toFixed(2),
        expiryDate: p.expiryDate,
        expiryText,
        active: p.active,
        updatedAt: p.updatedAt,
      };
    });

    return {
      rows,
      services,
      summary: {
        productCount: list.length,
        physicalCount: rows.length,
        serviceCount: services.length,
        totalStock: totalStock.toString(),
        totalStockValue: totalStockValue.toFixed(2),
        lowCount,
        outCount,
      },
    };
  }
}
