import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { OpenShiftUseCase } from "@/modules/pos/application/open-shift-use-case";

const schema = z.object({ openingCash: z.string() });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("pos.shift");
    const { openingCash } = schema.parse(await req.json());
    const useCase = new OpenShiftUseCase();
    const shift = await useCase.execute(session.user.id, openingCash);
    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
