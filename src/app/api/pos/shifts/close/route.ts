import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { CloseShiftUseCase } from "@/modules/pos/application/close-shift-use-case";

const schema = z.object({ shiftId: z.string(), actualCash: z.string() });

export async function POST(req: NextRequest) {
  try {
    await requireSession("pos.shift");
    const { shiftId, actualCash } = schema.parse(await req.json());
    const useCase = new CloseShiftUseCase();
    const shift = await useCase.execute(shiftId, actualCash);
    return NextResponse.json({ shift });
  } catch (error) {
    return toErrorResponse(error);
  }
}
