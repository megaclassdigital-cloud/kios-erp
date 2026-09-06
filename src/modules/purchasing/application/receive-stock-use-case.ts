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
  items: { productId: string; quantity: string; purchasePrice: string }[];
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
        return { ...item, subtotal: subtotal.toFixed(2) };
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
