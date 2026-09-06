import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ApproveStockOpnameUseCase } from "@/modules/stockopname/application/stock-opname-use-cases";

const schema = z.object({ opnameId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("stockopname.approve");
    const { opnameId } = schema.parse(await req.json());
    const useCase = new ApproveStockOpnameUseCase();
    const opname = await useCase.execute(opnameId, session.user.id);
    return NextResponse.json({ opname });
  } catch (error) {
    return toErrorResponse(error);
  }
}
