import Decimal from "decimal.js";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaProductRepository } from "../infrastructure/prisma-product-repository";
import { PrismaBarcodeRepository } from "../infrastructure/prisma-barcode-repository";
import { ProductNotFoundError } from "./update-product-use-case";

/**
 * Deleting a product from Master Produk.
 *
 * It is a soft delete, on purpose. Sales, receipts and the stock ledger all
 * point at the product row, and the barcode rule is that a barcode is never
 * freed for reuse -- so the row stays, is stamped deleted and deactivated, and
 * every active barcode is retired (kept, status RETIRED). The product vanishes
 * from every list and can no longer be scanned or sold, while history keeps
 * reading correctly.
 *
 * Refused while stock remains: deleting would silently write off goods that are
 * still on the shelf. Clear it through a stock opname or a sale first.
 */
export class DeleteProductUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const products = new PrismaProductRepository(tx);
      const barcodes = new PrismaBarcodeRepository(tx);

      const product = await products.findById(id);
      if (!product || product.deletedAt) throw new ProductNotFoundError("Produk tidak ditemukan.");

      if (product.productType === "PHYSICAL") {
        const stock = new Decimal(product.currentStock.toString());
        if (!stock.isZero()) {
          throw new Error(
            `Stok ${product.name} masih ${stock.toString()}. Kosongkan dulu (stok opname atau penjualan) sebelum menghapus produk.`
          );
        }
      }

      const retired: string[] = [];
      for (const b of product.barcodes) {
        if (b.status === "ACTIVE") {
          await barcodes.retire(b.id);
          retired.push(b.barcodeValue);
        }
      }

      await products.update(id, { deletedAt: new Date(), active: false });

      await new AuditLogger(tx).record({
        actorId,
        action: "PRODUCT_DELETED",
        entityType: "Product",
        entityId: id,
        beforeValue: { name: product.name, sku: product.sku, purchasePrice: product.purchasePrice.toString(), sellingPrice: product.sellingPrice.toString() },
        metadata: { retiredBarcodes: retired },
      });
    });
  }
}
