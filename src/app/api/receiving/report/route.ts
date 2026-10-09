import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetReceivingReportUseCase } from "@/modules/purchasing/application/get-receiving-report-use-case";
import { buildReceivingReportXlsx } from "@/modules/purchasing/infrastructure/receiving-report-xlsx";
import { XLSX_CONTENT_TYPE } from "@/shared/export/a4-workbook";
import { resolvePeriod } from "@/app/(app)/laporan/resolve-period";

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
    const report = await new GetReceivingReportUseCase().execute(period.start, period.end);

    if (searchParams.get("format") === "xlsx") {
      const file = await buildReceivingReportXlsx(report, period, session.user.name ?? "-");
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Content-Type": XLSX_CONTENT_TYPE,
          "Content-Disposition": `attachment; filename="barang-masuk-${period.key}-${stamp}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({
      period: { key: period.key, label: period.label, start: period.start, end: period.end },
      ...report,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
