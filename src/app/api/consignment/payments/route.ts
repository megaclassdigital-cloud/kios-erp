import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PayConsignorUseCase } from "@/modules/consignment/application/consignment-use-cases";

const schema = z.object({ supplierId: z.string().min(1), amount: z.string(), note: z.string().max(300).optional() });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("consignment.manage");
    const body = schema.parse(await req.json());
    const payment = await new PayConsignorUseCase().execute({ ...body, actorId: session.user.id });
    return NextResponse.json({ id: payment.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
