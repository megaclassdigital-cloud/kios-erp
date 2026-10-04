import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ConnectTerminalDeviceUseCase } from "@/modules/terminals/application/terminal-use-cases";

const schema = z.object({
  deviceKey: z.string().min(8).max(64),
  kind: z.enum(["SCANNER", "PRINTER"]),
  label: z.string().max(60),
  observed: z
    .object({
      medianIntervalMs: z.number().int().min(0).max(10_000),
      codeLength: z.number().int().min(1).max(64),
      terminator: z.enum(["enter", "tab", "idle"]),
    })
    .optional(),
});

/** Saves the hardware profile for this terminal — only ever reached from an
 * explicit confirmation by whoever is standing at it. */
export async function POST(req: NextRequest) {
  try {
    await requireSession("pos.operate");
    const body = schema.parse(await req.json());
    const terminal = await new ConnectTerminalDeviceUseCase().execute(body);
    return NextResponse.json({ terminal }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
