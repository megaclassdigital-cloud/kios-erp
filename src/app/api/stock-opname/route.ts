import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { StartStockOpnameUseCase } from "@/modules/stockopname/application/stock-opname-use-cases";

export async function POST() {
  try {
    const session = await requireSession("stockopname.manage");
    const useCase = new StartStockOpnameUseCase();
    const opname = await useCase.execute(session.user.id);
    return NextResponse.json({ opname }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
