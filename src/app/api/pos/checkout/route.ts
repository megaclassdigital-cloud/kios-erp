import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { CheckoutSaleUseCase } from "@/modules/pos/application/checkout-sale-use-case";

const schema = z.object({
  shiftId: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.string(),
        serviceDetail: z
          .object({
            phoneNumber: z.string().optional(),
            meterNumber: z.string().optional(),
            customerNumber: z.string().optional(),
          })
          .optional(),
      })
    )
    .min(1),
  paymentMethod: z.enum(["CASH", "CASHLESS"]),
  cashReceived: z.string().optional(),
  discount: z.string().optional(),
  idempotencyKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("pos.operate");
    const body = schema.parse(await req.json());
    const useCase = new CheckoutSaleUseCase();
    const sale = await useCase.execute({ ...body, cashierId: session.user.id });
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
