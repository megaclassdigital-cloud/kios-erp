import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetCurrentShiftUseCase } from "@/modules/pos/application/get-current-shift-use-case";

export async function GET() {
  try {
    const session = await requireSession("pos.shift");
    const useCase = new GetCurrentShiftUseCase();
    const shift = await useCase.execute(session.user.id);
    return NextResponse.json({ shift });
  } catch (error) {
    return toErrorResponse(error);
  }
}
