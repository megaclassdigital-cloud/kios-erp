import { prisma } from "@/shared/infrastructure/prisma";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { assertResetConfirmed, stockRestorePlan } from "../domain/transaction-reset";
import { PrismaTransactionResetRepository } from "../infrastructure/prisma-transaction-reset-repository";
import type { TransactionDataCounts } from "../repository/transaction-reset-repository";

/** What a reset would remove, without removing anything. */
export class PreviewTransactionResetUseCase {
  execute(): Promise<TransactionDataCounts> {
    return new PrismaTransactionResetRepository(prisma).count();
  }
}

/**
 * Clears cashier and transaction data -- sales, payments, shifts and the
 * stock movements they caused -- for the go-live moment after test sales.
 *
 * It never touches products, suppliers, receipts, stock updates, users or the
 * audit trail. Stock stays consistent either way:
 *  - restoreStock: the sale/refund movements are deleted and each product gets
 *    back exactly what they took out, so the shelf reads as if the test sales
 *    never happened;
 *  - otherwise the movements are kept (they point at sales that are gone, but
 *    the ledger still adds up to the stock shown).
 * All of it, plus the audit entry, is one transaction.
 */
export class ResetTransactionDataUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(req: { confirmation: string; restoreStock: boolean; actorId: string }) {
    assertResetConfirmed(req.confirmation);

    return this.txManager.run(async (tx) => {
      const repo = new PrismaTransactionResetRepository(tx);
      const before = await repo.count();

      if (req.restoreStock) {
        const products = new PrismaProductRepository(tx);
        for (const item of stockRestorePlan(await repo.stockEffects())) {
          await products.incrementStock(item.productId, item.give);
        }
        await repo.deleteSaleStockMovements();
      }
      await repo.deleteSalesAndShifts();
      await repo.deleteTransactionCounters();

      await new AuditLogger(tx).record({
        actorId: req.actorId,
        action: "TRANSACTION_DATA_RESET",
        entityType: "System",
        entityId: "transactions",
        beforeValue: before,
        metadata: { restoreStock: req.restoreStock },
      });
      return before;
    });
  }
}
