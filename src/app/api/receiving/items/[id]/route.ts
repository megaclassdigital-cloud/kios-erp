import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import {
  DeleteReceivedItemUseCase,
  UpdateReceivedItemUseCase,
} from "@/modules/purchasing/application/correct-received-item-use-cases";

const schema = z.object({
  quantity: z.string().optional(),
  purchasePrice: z.string().optional(),
  // "" or null clears the date on this line; absent leaves it alone.
  expiryDate: z.string().nullable().optional(),
});

/** Correct one received line (quantity / price / expiry). Stock follows. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("receiving.edit");
    const { id } = await params;
    const body = schema.parse(await req.json());
    const expiryDate =
      body.expiryDate === undefined ? undefined : body.expiryDate ? new Date(body.expiryDate) : null;
    if (expiryDate && Number.isNaN(expiryDate.getTime())) throw new Error("Tanggal kedaluwarsa tidak valid.");
    const result = await new UpdateReceivedItemUseCase().execute(
      id,
      { quantity: body.quantity, purchasePrice: body.purchasePrice, expiryDate },
      session.user.id
    );
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Delete one received line; the stock it added is taken back. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("receiving.edit");
    const { id } = await params;
    const result = await new DeleteReceivedItemUseCase().execute(id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
