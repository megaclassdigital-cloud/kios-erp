import Decimal from "decimal.js";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { StockEffect } from "../domain/transaction-reset";
import type { TransactionDataCounts, TransactionResetRepository } from "../repository/transaction-reset-repository";

/** Movements written by the till: a sale takes stock out, a refund puts it
 * back. Nothing else (receiving, opname, corrections) is ever matched. */
const SALE_MOVEMENTS = {
  OR: [
    { movementType: "SALE" as const, referenceType: "SALE" },
    { movementType: "RETURN_IN" as const, referenceType: "REFUND" },
  ],
};

export class PrismaTransactionResetRepository implements TransactionResetRepository {
  constructor(private readonly db: Db) {}

  async count(): Promise<TransactionDataCounts> {
    const [sales, saleItems, payments, shifts, stockMovements, numberCounters, effects] = await Promise.all([
      this.db.sale.count(),
      this.db.saleItem.count(),
      this.db.payment.count(),
      this.db.cashierShift.count(),
      this.db.stockMovement.count({ where: SALE_MOVEMENTS }),
      this.db.dailyCounter.count({ where: { scope: { startsWith: "TRX:" } } }),
      this.stockEffects(),
    ]);
    const unitsToRestore = effects.reduce((sum, e) => sum.minus(e.net), new Decimal(0));
    return { sales, saleItems, payments, shifts, stockMovements, unitsToRestore: unitsToRestore.toString(), numberCounters };
  }

  async stockEffects(): Promise<StockEffect[]> {
    const rows = await this.db.stockMovement.groupBy({
      by: ["productId"],
      where: SALE_MOVEMENTS,
      _sum: { quantity: true },
    });
    return rows.map((r) => ({ productId: r.productId, net: (r._sum.quantity ?? 0).toString() }));
  }

  /** Children before parents, so no foreign key is ever violated. */
  async deleteSalesAndShifts(): Promise<void> {
    await this.db.serviceSaleDetail.deleteMany();
    await this.db.payment.deleteMany();
    await this.db.saleItem.deleteMany();
    await this.db.sale.deleteMany();
    await this.db.cashierShift.deleteMany();
  }

  async deleteSaleStockMovements(): Promise<void> {
    await this.db.stockMovement.deleteMany({ where: SALE_MOVEMENTS });
  }

  async deleteTransactionCounters(): Promise<void> {
    await this.db.dailyCounter.deleteMany({ where: { scope: { startsWith: "TRX:" } } });
  }
}
