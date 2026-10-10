import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { DeleteStockInUseCase, UpdateStockInUseCase } from "@/modules/inventory/application/correct-stock-in-use-cases";

const schema = z.object({ quantity: z.string() });

/** Correct a stock addition that is not a supplier receipt (initial stock,
 * opname, return, adjustment). Stock follows. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("receiving.edit");
    const { id } = await params;
    const { quantity } = schema.parse(await req.json());
    return NextResponse.json(await new UpdateStockInUseCase().execute(id, quantity, session.user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Delete such a stock addition; the stock it added is taken back. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("receiving.edit");
    const { id } = await params;
    return NextResponse.json(await new DeleteStockInUseCase().execute(id, session.user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
