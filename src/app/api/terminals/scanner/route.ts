import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ClassifyTerminalScannerUseCase } from "@/modules/terminals/application/terminal-use-cases";

const schema = z.object({
  deviceKey: z.string().min(8).max(64),
  medianIntervalMs: z.number().int().min(0).max(10_000),
  codeLength: z.number().int().min(1).max(64),
  terminator: z.enum(["enter", "tab", "idle"]),
});

/**
 * Read-only: says whether the scan that just happened came from the scanner
 * this terminal already has on record. Connecting is always a separate,
 * explicitly confirmed call — nothing here ever writes a hardware profile.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession("pos.operate");
    const { deviceKey, ...observed } = schema.parse(await req.json());
    const verdict = await new ClassifyTerminalScannerUseCase().execute(deviceKey, observed);
    return NextResponse.json({ verdict });
  } catch (error) {
    return toErrorResponse(error);
  }
}
