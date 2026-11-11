import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { hasPermission } from "@/shared/security/permissions";
import { GetShiftCloseSummaryUseCase } from "@/modules/pos/application/get-shift-close-summary-use-case";
import { CloseShiftUseCase } from "@/modules/pos/application/close-shift-use-case";

const schema = z.object({ shiftId: z.string(), actualCash: z.string() });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("pos.shift");
    const { shiftId, actualCash } = schema.parse(await req.json());
    const useCase = new CloseShiftUseCase();
    const shift = await useCase.execute(shiftId, actualCash, session.user.id);
    // The shift is already closed; if the summary cannot be built the cashier
    // still gets a successful close, just without the takings screen.
    const summary = await new GetShiftCloseSummaryUseCase()
      .execute(shiftId, hasPermission(session.user.role, "finance.manage"))
      .catch(() => null);
    return NextResponse.json({ shift, summary });
  } catch (error) {
    return toErrorResponse(error);
  }
}
