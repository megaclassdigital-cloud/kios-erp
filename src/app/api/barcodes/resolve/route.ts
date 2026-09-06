import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ResolveBarcodeUseCase } from "@/modules/products/application/resolve-barcode-use-case";

const schema = z.object({ barcode: z.string().min(1) });

/** POS scan endpoint (PRD 11-13). Read-only — never mutates stock. */
export async function POST(req: NextRequest) {
  try {
    await requireSession("pos.operate");
    const { barcode } = schema.parse(await req.json());
    const useCase = new ResolveBarcodeUseCase();
    const result = await useCase.execute(barcode);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
