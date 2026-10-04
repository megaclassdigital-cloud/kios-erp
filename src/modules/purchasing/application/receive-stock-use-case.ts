import Decimal from "decimal.js";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { DailyCounterRepository } from "@/shared/infrastructure/daily-counter-repository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { PrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { PrismaPurchaseRepository } from "../infrastructure/prisma-purchase-repository";

export interface ReceiveStockRequest {
  supplierId: string;
  invoiceNumber?: string;
  receivedById: string;
  items: {
    productId: string;
    quantity: string;
    purchasePrice: string;
    /** Expiry printed on the batch that just arrived. Optional: not every
     * delivery has one, and omitting it leaves the product unchanged rather
     * than clearing a date someone set deliberately. */
    expiryDate?: Date | null;
  }[];
}

/**
 * Barang Masuk / Receiving (PRD 26-27): confirming a receiving note
 * atomically creates the Purchase record, StockMovement(PURCHASE, +qty)
 * per line, and updates the stock projection.
 */
export class ReceiveStockUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(req: ReceiveStockRequest) {
    if (req.items.length === 0) {
      throw new Error("Tidak ada item untuk diterima.");
    }

    return this.txManager.run(async (tx) => {
      const products = new PrismaProductRepository(tx);
      const inventory = new PrismaInventoryRepository(tx);
      const purchases = new PrismaPurchaseRepository(tx);
      const counters = new DailyCounterRepository(tx);
      const audit = new AuditLogger(tx);

      let totalAmount = new Decimal(0);
      const lineItems = req.items.map((item) => {
        const subtotal = new Decimal(item.purchasePrice).times(item.quantity);
        totalAmount = totalAmount.plus(subtotal);
        // Fields are picked explicitly rather than spread: expiryDate belongs
        // to the Product, not to a PurchaseItem, and a spread silently carried
        // it into the insert the moment it was added to the request type.
        return {
          productId: item.productId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          subtotal: subtotal.toFixed(2),
        };
      });

      const purchaseNumber = await counters.next("PO");

      const purchase = await purchases.create({
        purchaseNumber,
        supplierId: req.supplierId,
        invoiceNumber: req.invoiceNumber,
        receivedById: req.receivedById,
        totalAmount: totalAmount.toFixed(2),
        items: lineItems,
      });

      for (const item of req.items) {
        await inventory.recordMovement({
          productId: item.productId,
          quantity: item.quantity,
          movementType: "PURCHASE",
          referenceType: "PURCHASE",
          referenceId: purchase.id,
          actorId: req.receivedById,
        });
        await products.incrementStock(item.productId, item.quantity);

        // The delivery is the moment the expiry actually changes, so it is
        // recorded here rather than left for someone to remember to edit in
        // Master Produk later -- a date nobody updates is worse than none,
        // because the till will trust it. Same transaction as the stock
        // increase: a batch cannot land with the previous batch's date.
        if (item.expiryDate !== undefined && item.expiryDate !== null) {
          await products.update(item.productId, { expiryDate: item.expiryDate });
        }
      }

      await audit.record({
        actorId: req.receivedById,
        action: "STOCK_RECEIVED",
        entityType: "Purchase",
        entityId: purchase.id,
        afterValue: { purchaseNumber, totalAmount: totalAmount.toFixed(2) },
      });

      return purchase;
    });
  }
}
