import Decimal from "decimal.js";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { PrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";

export class SaleNotRefundableError extends Error {}

/**
 * PRD 49: refund never deletes the original sale — it flips status to
 * REFUNDED (excluding it from future revenue/HPP queries, which already
 * filter on status = PAID) and reverses inventory with a RETURN_IN
 * movement, never a bare stock overwrite.
 */
export class RefundSaleUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(saleId: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
      if (!sale || sale.status !== "PAID") {
        throw new SaleNotRefundableError("Transaksi tidak dapat direfund pada status ini.");
      }

      const products = new PrismaProductRepository(tx);
      const inventory = new PrismaInventoryRepository(tx);

      for (const item of sale.items) {
        const product = await products.findById(item.productId);
        if (!product?.trackInventory) continue;
        const quantity = new Decimal(item.quantity.toString());
        await inventory.recordMovement({
          productId: item.productId,
          quantity: quantity.toString(),
          movementType: "RETURN_IN",
          referenceType: "REFUND",
          referenceId: sale.id,
          actorId,
        });
        await products.incrementStock(item.productId, quantity.toString());
      }

      const refunded = await tx.sale.update({
        where: { id: saleId },
        data: { status: "REFUNDED" },
      });

      const audit = new AuditLogger(tx);
      await audit.record({
        actorId,
        action: "SALE_REFUNDED",
        entityType: "Sale",
        entityId: sale.id,
        beforeValue: { status: sale.status },
        afterValue: { status: "REFUNDED" },
      });

      return refunded;
    });
  }
}
