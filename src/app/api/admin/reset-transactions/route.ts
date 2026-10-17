import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import {
  PreviewTransactionResetUseCase,
  ResetTransactionDataUseCase,
} from "@/modules/admin/application/transaction-reset-use-cases";

/** What a reset would remove. Reads only. */
export async function GET() {
  try {
    await requireSession("data.reset");
    return NextResponse.json({ counts: await new PreviewTransactionResetUseCase().execute() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

const schema = z.object({ confirmation: z.string(), restoreStock: z.boolean() });

/** Owner only, and only with the typed confirmation phrase. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("data.reset");
    const body = schema.parse(await req.json());
    const removed = await new ResetTransactionDataUseCase().execute({ ...body, actorId: session.user.id });
    return NextResponse.json({ removed });
  } catch (error) {
    return toErrorResponse(error);
  }
}
