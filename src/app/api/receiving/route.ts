import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ReceiveStockUseCase } from "@/modules/purchasing/application/receive-stock-use-case";
import { PrismaPurchaseRepository } from "@/modules/purchasing/infrastructure/prisma-purchase-repository";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({
  supplierId: z.string(),
  invoiceNumber: z.string().optional(),
  items: z
    .array(z.object({ productId: z.string(), quantity: z.string(), purchasePrice: z.string() }))
    .min(1),
});

export async function GET() {
  try {
    await requireSession("receiving.manage");
    const repo = new PrismaPurchaseRepository(prisma);
    const purchases = await repo.listRecent(50);
    return NextResponse.json({ purchases });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("receiving.manage");
    const body = schema.parse(await req.json());
    const useCase = new ReceiveStockUseCase();
    const purchase = await useCase.execute({ ...body, receivedById: session.user.id });
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
