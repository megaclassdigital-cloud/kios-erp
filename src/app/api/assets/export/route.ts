import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ListAssetsUseCase } from "@/modules/assets/application/asset-use-cases";
import { buildAssetSpec, buildAssetXlsx } from "@/modules/assets/infrastructure/asset-export-spec";
import { buildA4Preview } from "@/shared/export/a4-preview";
import { XLSX_CONTENT_TYPE } from "@/shared/export/a4-workbook";

/** Aset Toko as an A4 sheet. `?format=preview` returns it as display text for the preview window. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("assets.manage");
    const { assets } = await new ListAssetsUseCase().execute();
    const by = session.user.name ?? "-";
    if (new URL(req.url).searchParams.get("format") === "preview") {
      return NextResponse.json({ sheets: buildA4Preview(buildAssetSpec(assets, by)) });
    }
    const file = await buildAssetXlsx(assets, by);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="aset-toko-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
