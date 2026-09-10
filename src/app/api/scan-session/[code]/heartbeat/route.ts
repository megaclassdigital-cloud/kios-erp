import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { HeartbeatScanSessionUseCase } from "@/modules/scanning/application/heartbeat-scan-session-use-case";

/** Phone side pings this every few seconds while connected, independent of
 * whether it's actually scanning anything — see the use case for why. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireSession();
    const { code } = await params;
    const useCase = new HeartbeatScanSessionUseCase();
    await useCase.execute(code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
