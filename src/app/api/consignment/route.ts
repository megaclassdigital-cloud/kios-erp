import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetConsignmentOverviewUseCase, ReceiveConsignmentUseCase } from "@/modules/consignment/application/consignment-use-cases";

const receiveSchema = z.object({
  supplierId: z.string().min(1),
  note: z.string().max(300).optional(),
  lines: z.array(z.object({ productId: z.string(), quantity: z.string(), unitCost: z.string(), sellingPrice: z.string().optional() })).min(1),
});

/** Each consignor's position, the drop-offs and the payments. Polled by the page for live numbers. */
export async function GET() {
  try {
    await requireSession("consignment.manage");
    const data = await new GetConsignmentOverviewUseCase().execute();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("consignment.manage");
    const body = receiveSchema.parse(await req.json());
    const { consignment, warnings } = await new ReceiveConsignmentUseCase().execute({ ...body, actorId: session.user.id });
    return NextResponse.json({ consignment: { id: consignment.id, number: consignment.number }, warnings }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
