import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { CreateScanSessionUseCase } from "@/modules/scanning/application/create-scan-session-use-case";

const schema = z.object({ label: z.string().max(80).optional() });

/** Any authenticated user may open a pairing session — the barcode itself
 * carries no privilege, whatever page consumes the scan still enforces
 * its own permission on the resulting action (checkout, receiving, etc). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { label } = schema.parse(await req.json().catch(() => ({})));
    const useCase = new CreateScanSessionUseCase();
    const scanSession = await useCase.execute(session.user.id, label);
    return NextResponse.json(
      { code: scanSession.code, expiresAt: scanSession.expiresAt },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
