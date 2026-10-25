import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ForbiddenError, hasPermission } from "@/shared/security/permissions";
import { ResolveBarcodeUseCase } from "@/modules/products/application/resolve-barcode-use-case";

const schema = z.object({ barcode: z.string().min(1) });

/** POS scan endpoint (PRD 11-13). Read-only — never mutates stock. */
export async function POST(req: NextRequest) {
  try {
    // The till scans to sell; Barang Masuk scans to receive. Either role may look a barcode up.
    const session = await requireSession();
    if (!hasPermission(session.user.role, "pos.operate") && !hasPermission(session.user.role, "receiving.manage")) {
      throw new ForbiddenError();
    }
    const { barcode } = schema.parse(await req.json());
    const useCase = new ResolveBarcodeUseCase();
    const result = await useCase.execute(barcode);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
