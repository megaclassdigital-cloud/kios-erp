import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { RetireBarcodeUseCase } from "@/modules/products/application/retire-barcode-use-case";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("barcode.manage");
    const { id } = await params;
    const useCase = new RetireBarcodeUseCase();
    const barcode = await useCase.execute(id, session.user.id);
    return NextResponse.json({ barcode });
  } catch (error) {
    return toErrorResponse(error);
  }
}
