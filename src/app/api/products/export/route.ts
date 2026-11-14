import { NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetProductExportUseCase } from "@/modules/products/application/get-product-export-use-case";
import { buildProductExportSpecs } from "@/modules/products/infrastructure/product-export-xlsx";
import { parseExportFormat, respondWithSpecs } from "@/shared/export/export-response";
import { wibDayKey } from "@/shared/format/wib";

/** Master Produk as an A4 sheet (preview, Excel, PDF, CSV). `?search=` applies the same filter as the search box. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("products.manage");
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const data = await new GetProductExportUseCase().execute(search);
    const specs = buildProductExportSpecs(data, search, session.user.name ?? "-");
    return await respondWithSpecs(specs, parseExportFormat(searchParams.get("format")), `master-produk-${wibDayKey(new Date())}`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
