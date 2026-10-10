import Decimal from "decimal.js";
import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaPurchaseRepository } from "../infrastructure/prisma-purchase-repository";
import type { PurchaseRepository, ReceivedItemFilter, ReceivedItemRow } from "../repository/purchase-repository";

export interface ReceivingReport {
  rows: ReceivedItemRow[];
  /** Things that could not be loaded; shown to the user instead of hidden. */
  warnings: string[];
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
    // Supplier receipts plus stock updates (initial stock, opname increases,
    // adjustments). Stock is one ledger, so the history reads it too --
    // otherwise the Stok page could show goods the history never mentions.
    const warnings: string[] = [];
    const [purchaseRows, otherRows] = await Promise.all([
      this.purchases.listReceivedItems(filter),
      filter.only === "purchase"
        ? Promise.resolve([])
        : this.purchases.listOtherStockIn(filter).catch((error: unknown) => {
            // The supplier receipts are still valid, so show them and say what
            // is missing rather than failing the whole history.
            console.error("[receiving-report] could not load non-supplier stock additions", error);
            warnings.push("Pembaruan stok (stok awal, stok opname, penyesuaian) belum bisa dimuat. Penerimaan supplier tetap lengkap.");
            return [] as ReceivedItemRow[];
          }),
    ]);
    const rows = [...purchaseRows, ...otherRows].sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    let totalQuantity = new Decimal(0);
    let totalValue = new Decimal(0);
    for (const r of rows) {
      totalQuantity = totalQuantity.plus(r.quantity);
      // Only supplier receipts have a cost; initial stock, opname and returns
      // add goods but no purchase value.
      if (r.subtotal !== null) totalValue = totalValue.plus(r.subtotal);
    }

    return {
      rows,
      warnings,
      summary: {
        receiptCount: new Set(rows.map((r) => r.purchaseNumber).filter((n) => n !== null)).size,
        lineCount: rows.length,
        totalQuantity: totalQuantity.toString(),
        totalValue: totalValue.toFixed(2),
      },
    };
  }
}
