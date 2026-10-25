import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { RecordStockOutUseCase } from "@/modules/inventory/application/record-stock-out-use-case";
import { ListStockOutUseCase } from "@/modules/inventory/application/list-stock-out-use-case";
import { resolvePeriod } from "@/app/(app)/laporan/resolve-period";

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.string().min(1),
  reason: z.enum(["RUSAK", "KEDALUWARSA", "RETUR_SUPPLIER", "LAINNYA"]),
  note: z.string().max(300).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireSession("stockout.manage");
    const { searchParams } = new URL(req.url);
    const period = resolvePeriod({
      period: searchParams.get("period") ?? "month",
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    const rows = await new ListStockOutUseCase().execute(period);
    return NextResponse.json({ rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("stockout.manage");
    const body = schema.parse(await req.json());
    const result = await new RecordStockOutUseCase().execute({ ...body, actorId: session.user.id });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
