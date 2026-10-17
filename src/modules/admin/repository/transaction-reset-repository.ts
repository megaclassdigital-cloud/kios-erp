import type { StockEffect } from "../domain/transaction-reset";

export interface TransactionDataCounts {
  sales: number;
  saleItems: number;
  payments: number;
  shifts: number;
  /** Stock movements written by sales and refunds. */
  stockMovements: number;
  /** Sum of the units those movements took off the shelf (net of refunds). */
  unitsToRestore: string;
  numberCounters: number;
}

/** Cashier and transaction data only: sales, payments, shifts and what they did
 * to stock. Products, suppliers, receipts, users and the audit trail are out of
 * its reach by construction. */
export interface TransactionResetRepository {
  count(): Promise<TransactionDataCounts>;
  stockEffects(): Promise<StockEffect[]>;
  deleteSalesAndShifts(): Promise<void>;
  deleteSaleStockMovements(): Promise<void>;
  deleteTransactionCounters(): Promise<void>;
}
