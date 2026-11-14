import type { A4Spec } from "@/shared/export/a4-workbook";
import type { ReportContext } from "../domain/report-data";
import { buildCashierSpecs, buildFinanceSpecs, buildInventorySpecs, buildProductSpecs, buildTransactionsSpec } from "../domain/report-specs";
import { PrismaReportRepository } from "../infrastructure/prisma-report-repository";

export type ReportTab = "keuangan" | "produk" | "inventaris" | "kasir";
export const REPORT_TABS: ReportTab[] = ["keuangan", "produk", "inventaris", "kasir"];
const TRANSACTION_EXPORT_LIMIT = 5000;

/** The sheets behind every report export, for Laporan, Keuangan and Transaksi alike. */
export class GetReportSpecsUseCase {
  constructor(private readonly repo = new PrismaReportRepository()) {}

  async forTab(tab: ReportTab, ctx: ReportContext): Promise<{ specs: A4Spec[]; fileBase: string }> {
    const { start, end } = ctx.period;
    switch (tab) {
      case "produk":
        return { specs: buildProductSpecs(await this.repo.products(start, end), ctx), fileBase: "laporan-produk" };
      case "inventaris":
        return { specs: buildInventorySpecs(await this.repo.inventory(start, end), ctx), fileBase: "laporan-inventaris" };
      case "kasir":
        return { specs: buildCashierSpecs(await this.repo.cashiers(start, end), ctx), fileBase: "laporan-kasir" };
      default:
        return { specs: buildFinanceSpecs(await this.repo.finance(start, end), ctx), fileBase: "laporan-keuangan" };
    }
  }

  /** `cashierId` limits the list to one cashier's own sales (a role that may not see all). */
  async forTransactions(ctx: ReportContext, cashierId?: string): Promise<{ specs: A4Spec[]; fileBase: string }> {
    const { records, total } = await this.repo.transactions(ctx.period.start, ctx.period.end, cashierId, TRANSACTION_EXPORT_LIMIT);
    const note = total > records.length ? `Menampilkan ${records.length} terbaru dari ${total} transaksi pada periode ini.` : undefined;
    const scope = cashierId ? "Hanya transaksi kasir ini" : "Semua kasir";
    return { specs: [buildTransactionsSpec(records, ctx, scope, note)], fileBase: "riwayat-transaksi" };
  }
}
