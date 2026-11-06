import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { RecordCatchUpSaleUseCase } from "@/modules/consignment/application/consignment-use-cases";

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.string(),
  soldAt: z.string().optional(),
  note: z.string().max(300).optional(),
});

/** Consigned units sold earlier but never rung up at the till. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("consignment.manage");
    const body = schema.parse(await req.json());
    const soldAt = body.soldAt ? new Date(body.soldAt) : undefined;
    if (soldAt && (Number.isNaN(soldAt.getTime()) || soldAt.getTime() > Date.now() + 60_000)) {
      return NextResponse.json({ error: "Tanggal penjualan tidak valid." }, { status: 400 });
    }
    const result = await new RecordCatchUpSaleUseCase().execute({ ...body, soldAt, actorId: session.user.id });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
