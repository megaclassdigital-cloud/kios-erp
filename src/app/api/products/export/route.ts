import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetProductExportUseCase } from "@/modules/products/application/get-product-export-use-case";
import { buildProductExportSpecs, buildProductExportXlsx } from "@/modules/products/infrastructure/product-export-xlsx";
import { buildA4Preview } from "@/shared/export/a4-preview";
import { XLSX_CONTENT_TYPE } from "@/shared/export/a4-workbook";

/** Master Produk as an A4 XLSX. `?search=` applies the same filter as the
 * search box on the screen. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("products.manage");
    const search = new URL(req.url).searchParams.get("search") ?? "";
    const data = await new GetProductExportUseCase().execute(search);
    // `?format=preview`: the same sheets as display text, for the preview window.
    if (new URL(req.url).searchParams.get("format") === "preview") {
      return NextResponse.json({ sheets: buildA4Preview(buildProductExportSpecs(data, search, session.user.name ?? "-")) });
    }
    const file = await buildProductExportXlsx(data, search, session.user.name ?? "-");
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="master-produk-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
