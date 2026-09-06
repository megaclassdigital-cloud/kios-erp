import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { SubmitStockOpnameUseCase } from "@/modules/stockopname/application/stock-opname-use-cases";

const schema = z.object({
  opnameId: z.string(),
  lines: z.array(z.object({ productId: z.string(), physicalQty: z.string() })).min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession("stockopname.manage");
    const { opnameId, lines } = schema.parse(await req.json());
    const useCase = new SubmitStockOpnameUseCase();
    const opname = await useCase.execute(opnameId, lines);
    return NextResponse.json({ opname });
  } catch (error) {
    return toErrorResponse(error);
  }
}
