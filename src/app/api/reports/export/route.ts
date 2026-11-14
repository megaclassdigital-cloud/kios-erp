import { NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { resolvePeriod } from "@/app/(app)/laporan/resolve-period";
import { GetReportSpecsUseCase, REPORT_TABS, type ReportTab } from "@/modules/reports/application/get-report-specs-use-case";
import { parseExportFormat, respondWithSpecs } from "@/shared/export/export-response";
import { wibDayKey } from "@/shared/format/wib";

/**
 * Keuangan and Laporan exports. `?format=` is preview | xlsx | pdf | csv; the
 * preview (shown, and printed from, on screen) and every file come from the
 * same sheet specs.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("reports.view");
    const { searchParams } = new URL(req.url);
    const tabParam = searchParams.get("tab") ?? "keuangan";
    const tab: ReportTab = (REPORT_TABS as string[]).includes(tabParam) ? (tabParam as ReportTab) : "keuangan";
    const period = resolvePeriod({
      period: searchParams.get("period") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    const now = new Date();
    const { specs, fileBase } = await new GetReportSpecsUseCase().forTab(tab, {
      period,
      printedBy: session.user.name ?? "-",
      printedAt: now,
    });
    return await respondWithSpecs(specs, parseExportFormat(searchParams.get("format"), "csv"), `${fileBase}-${period.key}-${wibDayKey(now)}`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
