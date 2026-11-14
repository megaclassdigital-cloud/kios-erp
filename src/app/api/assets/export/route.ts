import { NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ListAssetsUseCase } from "@/modules/assets/application/asset-use-cases";
import { buildAssetSpec } from "@/modules/assets/infrastructure/asset-export-spec";
import { parseExportFormat, respondWithSpecs } from "@/shared/export/export-response";
import { wibDayKey } from "@/shared/format/wib";

/** Aset Toko as an A4 sheet (preview, Excel, PDF, CSV). */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("assets.manage");
    const { assets } = await new ListAssetsUseCase().execute();
    const spec = buildAssetSpec(assets, session.user.name ?? "-");
    return await respondWithSpecs([spec], parseExportFormat(new URL(req.url).searchParams.get("format")), `aset-toko-${wibDayKey(new Date())}`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
