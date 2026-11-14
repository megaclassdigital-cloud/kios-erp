import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetReceivingReportUseCase } from "@/modules/purchasing/application/get-receiving-report-use-case";
import { buildReceivingReportSpec } from "@/modules/purchasing/infrastructure/receiving-report-xlsx";
import { parseExportFormat, respondWithSpecs } from "@/shared/export/export-response";
import { resolvePeriod } from "@/app/(app)/laporan/resolve-period";
import { wibDayKey } from "@/shared/format/wib";

/** Barang Masuk history for a period. `?format=xlsx` returns the same rows as
 * an A4 workbook; otherwise JSON for the on-screen table. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("receiving.manage");
    const { searchParams } = new URL(req.url);
    const period = resolvePeriod({
      period: searchParams.get("period") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    const productId = searchParams.get("productId") ?? undefined;
    const only = searchParams.get("only") === "purchase" ? ("purchase" as const) : undefined;
    const report = await new GetReceivingReportUseCase().execute({ start: period.start, end: period.end, productId, only });

    const format = searchParams.get("format");
    if (format) {
      const spec = buildReceivingReportSpec(report, period, session.user.name ?? "-", productId ? report.rows[0]?.productName : undefined);
      return await respondWithSpecs([spec], parseExportFormat(format), `barang-masuk-${period.key}-${wibDayKey(new Date())}`);
    }

    return NextResponse.json({
      period: { key: period.key, label: period.label, start: period.start, end: period.end },
      ...report,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
