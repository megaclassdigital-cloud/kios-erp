import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { RegisterTerminalUseCase } from "@/modules/terminals/application/terminal-use-cases";

const schema = z.object({
  deviceKey: z.string().min(8).max(64),
  name: z.string().max(60).optional(),
});

/** Called on every POS load. Idempotent: registers this machine the first
 * time, refreshes lastSeenAt thereafter. */
export async function POST(req: NextRequest) {
  try {
    await requireSession("pos.operate");
    const { deviceKey, name } = schema.parse(await req.json());
    const terminal = await new RegisterTerminalUseCase().execute(deviceKey, name ?? "Terminal Baru");
    return NextResponse.json({ terminal });
  } catch (error) {
    return toErrorResponse(error);
  }
}
