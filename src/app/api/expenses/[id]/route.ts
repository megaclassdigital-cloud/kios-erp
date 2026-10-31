import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { DeleteExpenseUseCase, UpdateExpenseUseCase } from "@/modules/finance/application/expense-use-cases";

const schema = z.object({
  category: z.enum(["SUPPLIER", "ELECTRICITY", "TRANSPORT", "SALARY", "OPERATIONAL", "OTHER"]),
  amount: z.string(),
  description: z.string().optional(),
  expenseDate: z.string(),
});

/** Correct a saved expense. SUPPLIER is accepted by the schema only so an old record can keep it; the use case refuses switching to it. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("finance.manage");
    const { id } = await params;
    const expense = await new UpdateExpenseUseCase().execute(id, schema.parse(await req.json()), session.user.id);
    return NextResponse.json({ expense });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("finance.manage");
    const { id } = await params;
    await new DeleteExpenseUseCase().execute(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
