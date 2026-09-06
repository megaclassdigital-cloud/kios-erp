import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { AddBarcodeToProductUseCase } from "@/modules/products/application/add-barcode-to-product-use-case";

const schema = z.union([
  z.object({ mode: z.literal("SCAN_EXISTING"), value: z.string(), unit: z.string(), conversionFactor: z.string().optional() }),
  z.object({ mode: z.literal("GENERATE_INTERNAL"), unit: z.string() }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("barcode.manage");
    const { id } = await params;
    const body = schema.parse(await req.json());
    const useCase = new AddBarcodeToProductUseCase();
    const barcode = await useCase.execute(id, body, session.user.id);
    return NextResponse.json({ barcode }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
