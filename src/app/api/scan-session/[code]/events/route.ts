import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { SubmitScanEventUseCase } from "@/modules/scanning/application/submit-scan-event-use-case";
import { PollScanEventsUseCase } from "@/modules/scanning/application/poll-scan-events-use-case";
import { ScanSessionDomainService } from "@/modules/scanning/domain/scan-session-domain-service";

const submitSchema = z.object({ barcodeValue: z.string().min(1) });

/** Phone -> here on every decoded barcode. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireSession();
    const { code } = await params;
    const { barcodeValue } = submitSchema.parse(await req.json());
    const useCase = new SubmitScanEventUseCase();
    await useCase.execute(code, barcodeValue);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Desktop polls this (~1s) for scans that arrived since its last check. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await requireSession();
    const { code } = await params;
    const { searchParams } = new URL(req.url);
    const afterParam = searchParams.get("after");
    const after = afterParam ? new Date(afterParam) : null;

    const useCase = new PollScanEventsUseCase();
    const { session: scanSession, events } = await useCase.execute(code, session.user.id, after);
    const domain = new ScanSessionDomainService();
    return NextResponse.json({
      events: events.map((e) => ({ id: e.id, barcodeValue: e.barcodeValue, createdAt: e.createdAt })),
      connected: scanSession.claimedAt !== null && !domain.isStale(scanSession),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
