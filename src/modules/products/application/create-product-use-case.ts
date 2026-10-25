import { DuplicateProductError } from "../domain/duplicate-product-error";
import { duplicateMessage, findDuplicate } from "../domain/duplicate-product";
import { parseDamaged, usableQuantity } from "@/modules/inventory/domain/receiving-damage";
import { RECEIVE_DAMAGE } from "@/modules/inventory/repository/inventory-repository";
import type { ProductType, ServiceType } from "@prisma/client";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaProductRepository } from "../infrastructure/prisma-product-repository";
import { PrismaBarcodeRepository } from "../infrastructure/prisma-barcode-repository";
import { PrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { BarcodeDomainService } from "../domain/barcode-domain-service";
import { BarcodeValue, isValidEan13 } from "@/shared/barcode/barcode-value";

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
  expiryDate?: Date | null;
  expiryWarnDays?: number;
  initialStock?: string;
  /** Part of initialStock that is damaged: counted in, then taken straight off. */
  initialDamaged?: string;
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

      // Already in Master Produk? Then the stock belongs in Barang Masuk, not
      // in a second record of the same item.
      const known = await products.listForDuplicateCheck();
      const duplicate = findDuplicate(known, {
        name: req.name,
        sku: req.sku,
        barcode: req.barcode.mode === "SCAN_EXISTING" ? BarcodeValue.normalize(req.barcode.value).toString() : undefined,
      });
      if (duplicate) throw new DuplicateProductError(duplicateMessage(duplicate));

      const existingSku = await products.findBySku(req.sku);
      if (existingSku) {
        // Only reachable for a soft-deleted product: its SKU stays reserved.
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
        // A service has nothing physical to expire, so any date sent for one
        // is dropped here rather than stored and later shown as a warning
        // about pulsa going off.
        expiryDate: req.productType === "SERVICE" ? null : (req.expiryDate ?? null),
        expiryWarnDays: req.expiryWarnDays,
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
          barcodeType: isValidEan13(normalized) ? "EAN13" : "CODE128",
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
        const damaged = parseDamaged(req.initialStock, req.initialDamaged);
        const initial = await inventory.recordMovement({
          productId: product.id,
          quantity: req.initialStock,
          movementType: "INITIAL_STOCK",
          referenceType: "PRODUCT_INIT",
          referenceId: product.id,
          actorId: req.actorId,
        });
        if (damaged.gt(0)) {
          await inventory.recordMovement({
            productId: product.id,
            quantity: damaged.negated().toString(),
            movementType: "DAMAGE",
            referenceType: RECEIVE_DAMAGE,
            referenceId: initial.id,
            actorId: req.actorId,
            note: `Rusak saat stok awal: ${damaged.toString()} dari ${req.initialStock}`,
          });
        }
        // The projection moves once, by what is actually sellable.
        await products.incrementStock(product.id, usableQuantity(req.initialStock, damaged.toString()));
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
