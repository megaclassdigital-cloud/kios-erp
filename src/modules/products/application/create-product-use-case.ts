import type { ProductType, ServiceType } from "@prisma/client";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaProductRepository } from "../infrastructure/prisma-product-repository";
import { PrismaBarcodeRepository } from "../infrastructure/prisma-barcode-repository";
import { PrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { BarcodeDomainService } from "../domain/barcode-domain-service";
import { BarcodeValue } from "@/shared/barcode/barcode-value";

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  productType: ProductType;
  serviceType?: ServiceType;
  serviceProvider?: string;
  baseUnit: string;
  purchasePrice: string;
  sellingPrice: string;
  minimumStock: number;
  trackInventory: boolean;
  initialStock?: string;
  barcode:
    | { mode: "SCAN_EXISTING"; value: string; unit: string; conversionFactor?: string }
    | { mode: "GENERATE_INTERNAL"; unit: string }
    | { mode: "NONE" };
  actorId: string;
}

/**
 * Orchestrates PRD flow section 43-44: create product, attach/generate a
 * barcode, and record initial stock as a StockMovement — all atomically.
 */
export class CreateProductUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(req: CreateProductRequest) {
    if (req.productType === "SERVICE" && !req.serviceType) {
      throw new Error("Jenis layanan (Pulsa/Token Listrik) wajib dipilih untuk produk layanan.");
    }
    const barcodeDomain = new BarcodeDomainService();

    return this.txManager.run(async (tx) => {
      const products = new PrismaProductRepository(tx);
      const barcodes = new PrismaBarcodeRepository(tx);
      const inventory = new PrismaInventoryRepository(tx);
      const audit = new AuditLogger(tx);

      const existingSku = await products.findBySku(req.sku);
      if (existingSku) {
        throw new Error("SKU sudah digunakan produk lain.");
      }

      const product = await products.create({
        sku: req.sku,
        name: req.name,
        description: req.description,
        categoryId: req.categoryId ?? null,
        productType: req.productType,
        serviceType: req.productType === "SERVICE" ? req.serviceType : undefined,
        serviceProvider: req.productType === "SERVICE" ? req.serviceProvider : undefined,
        baseUnit: req.baseUnit,
        purchasePrice: req.purchasePrice,
        sellingPrice: req.sellingPrice,
        minimumStock: req.minimumStock,
        trackInventory: req.trackInventory,
      });

      if (req.barcode.mode === "SCAN_EXISTING") {
        const normalized = BarcodeValue.normalize(req.barcode.value).toString();
        const existing = await barcodes.findByValue(normalized);
        if (existing) {
          barcodeDomain.assertNotRetired(existing.status);
          barcodeDomain.assertCanAttach(existing.productId, product.id);
        }
        await barcodes.create({
          productId: product.id,
          barcodeValue: normalized,
          barcodeType: "EAN13",
          unit: req.barcode.unit,
          conversionFactor: req.barcode.conversionFactor ?? "1",
          source: "MANUFACTURER",
        });
      } else if (req.barcode.mode === "GENERATE_INTERNAL") {
        const sequence = await barcodes.nextInternalSequence();
        const value = barcodeDomain.formatInternalBarcode(sequence);
        await barcodes.create({
          productId: product.id,
          barcodeValue: value,
          barcodeType: "CODE128",
          unit: req.barcode.unit,
          conversionFactor: "1",
          source: "INTERNAL",
        });
      }

      if (req.trackInventory && req.initialStock && Number(req.initialStock) > 0) {
        await inventory.recordMovement({
          productId: product.id,
          quantity: req.initialStock,
          movementType: "INITIAL_STOCK",
          referenceType: "PRODUCT_INIT",
          referenceId: product.id,
          actorId: req.actorId,
        });
        await products.incrementStock(product.id, req.initialStock);
      }

      await audit.record({
        actorId: req.actorId,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        afterValue: { sku: product.sku, name: product.name },
      });

      return products.findById(product.id);
    });
  }
}
