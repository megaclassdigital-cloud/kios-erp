import Decimal from "decimal.js";
import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaPurchaseRepository } from "../infrastructure/prisma-purchase-repository";
import type { PurchaseRepository, ReceivedItemFilter, ReceivedItemRow } from "../repository/purchase-repository";

export interface ReceivingReport {
  rows: ReceivedItemRow[];
  summary: {
    receiptCount: number;
    lineCount: number;
    totalQuantity: string;
    totalValue: string;
  };
}

/**
 * Barang Masuk report: every line received in a period, with totals.
 *
 * The on-screen history and the XLSX download both call this, so the two can
 * only differ in formatting -- never in which rows they include.
 */
export class GetReceivingReportUseCase {
  constructor(private readonly purchases: PurchaseRepository = new PrismaPurchaseRepository(prisma)) {}

  async execute(filter: ReceivedItemFilter): Promise<ReceivingReport> {
    const rows = await this.purchases.listReceivedItems(filter);

    let totalQuantity = new Decimal(0);
    let totalValue = new Decimal(0);
    for (const r of rows) {
      totalQuantity = totalQuantity.plus(r.quantity);
      totalValue = totalValue.plus(r.subtotal);
    }

    return {
      rows,
      summary: {
        receiptCount: new Set(rows.map((r) => r.purchaseNumber)).size,
        lineCount: rows.length,
        totalQuantity: totalQuantity.toString(),
        totalValue: totalValue.toFixed(2),
      },
    };
  }
}
