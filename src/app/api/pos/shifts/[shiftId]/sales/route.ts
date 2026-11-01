import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { hasPermission } from "@/shared/security/permissions";
import { ListShiftSalesUseCase } from "@/modules/pos/application/list-shift-sales-use-case";

/** The sales of one shift, with their lines: the history shown under the till. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ shiftId: string }> }) {
  try {
    const session = await requireSession("pos.operate");
    const { shiftId } = await params;
    const result = await new ListShiftSalesUseCase().execute(shiftId, session.user.id, hasPermission(session.user.role, "shifts.monitor"));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
