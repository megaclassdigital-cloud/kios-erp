import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ListTerminalsUseCase } from "@/modules/terminals/application/terminal-use-cases";

export async function GET() {
  try {
    await requireSession("terminals.view");
    const terminals = await new ListTerminalsUseCase().execute();
    return NextResponse.json({ terminals });
  } catch (error) {
    return toErrorResponse(error);
  }
}
