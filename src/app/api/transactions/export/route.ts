import { NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { hasPermission } from "@/shared/security/permissions";
import { resolvePeriod } from "@/app/(app)/laporan/resolve-period";
import { GetReportSpecsUseCase } from "@/modules/reports/application/get-report-specs-use-case";
import { parseExportFormat, respondWithSpecs } from "@/shared/export/export-response";
import { wibDayKey } from "@/shared/format/wib";

/** Riwayat Transaksi for the chosen period (preview, Excel, PDF, CSV). A role without "view_all" only gets its own sales, as on the page. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("transactions.view");
    const { searchParams } = new URL(req.url);
    const period = resolvePeriod({
      period: searchParams.get("period") ?? "today",
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    const seeAll = hasPermission(session.user.role, "transactions.view_all");
    const now = new Date();
    const { specs, fileBase } = await new GetReportSpecsUseCase().forTransactions(
      { period, printedBy: session.user.name ?? "-", printedAt: now },
      seeAll ? undefined : session.user.id
    );
    return await respondWithSpecs(specs, parseExportFormat(searchParams.get("format")), `${fileBase}-${period.key}-${wibDayKey(now)}`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
