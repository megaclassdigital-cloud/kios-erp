import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ConfirmCashlessPaymentUseCase } from "@/modules/pos/application/confirm-cashless-payment-use-case";

const schema = z.object({ saleId: z.string(), providerRef: z.string().optional() });

/** Simulated cashless provider callback (PRD 17, MVP manual confirmation).
 * Idempotent by design — see ConfirmCashlessPaymentUseCase. */
export async function POST(req: NextRequest) {
  try {
    await requireSession("pos.operate");
    const { saleId, providerRef } = schema.parse(await req.json());
    const useCase = new ConfirmCashlessPaymentUseCase();
    const sale = await useCase.execute(saleId, providerRef);
    return NextResponse.json({ sale });
  } catch (error) {
    return toErrorResponse(error);
  }
}
