import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { RefundSaleUseCase } from "@/modules/pos/application/refund-sale-use-case";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("refund.manage");
    const { id } = await params;
    const useCase = new RefundSaleUseCase();
    const sale = await useCase.execute(id, session.user.id);
    return NextResponse.json({ sale });
  } catch (error) {
    return toErrorResponse(error);
  }
}
