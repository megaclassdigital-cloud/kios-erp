import { randomUUID } from "node:crypto";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { planStockOut, STOCK_OUT_REFERENCE, type StockOutReason } from "../domain/stock-out";
import { moveStock } from "./move-stock";

export class StockOutProductNotFoundError extends Error {}

export interface RecordStockOutRequest {
  productId: string;
  quantity: string;
  reason: StockOutReason;
  note?: string;
  actorId: string;
}

/**
 * Pengeluaran barang: goods leave the shelf without a sale (damaged, expired,
 * returned to the supplier, used up). A negative StockMovement plus the stock
 * projection, in one transaction -- and refused when it would take stock below
 * zero, like every other decrease.
 */
export class RecordStockOutUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(req: RecordStockOutRequest) {
    const plan = planStockOut(req);

    return this.txManager.run(async (tx) => {
      const product = await new PrismaProductRepository(tx).findById(req.productId);
      if (!product || product.deletedAt || !product.trackInventory) {
        throw new StockOutProductNotFoundError("Produk tidak ditemukan atau tidak memiliki stok.");
      }

      const stockOutId = randomUUID();
      await moveStock(
        tx,
        { productId: product.id, productName: product.name },
        `-${plan.quantity}`,
        STOCK_OUT_REFERENCE,
        stockOutId,
        req.actorId,
        plan.note,
        plan.movementType
      );

      await new AuditLogger(tx).record({
        actorId: req.actorId,
        action: "STOCK_OUT_RECORDED",
        entityType: "Product",
        entityId: product.id,
        afterValue: { quantity: plan.quantity, reason: req.reason, note: plan.note },
      });

      return { stockOutId, productId: product.id, quantity: plan.quantity };
    });
  }
}
