import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetScanSessionUseCase } from "@/modules/scanning/application/get-scan-session-use-case";
import { DisconnectScanSessionUseCase } from "@/modules/scanning/application/disconnect-scan-session-use-case";

/** Phone side calls this first to confirm the code is real before it ever
 * turns the camera on, and to show "connected to <label>". */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireSession();
    const { code } = await params;
    const useCase = new GetScanSessionUseCase();
    const session = await useCase.execute(code);
    return NextResponse.json({
      label: session.label,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await requireSession();
    const { code } = await params;
    const useCase = new DisconnectScanSessionUseCase();
    await useCase.execute(code, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
