import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ReturnConsignmentItemUseCase } from "@/modules/consignment/application/consignment-use-cases";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("consignment.manage");
    const { id } = await params;
    const { quantity } = z.object({ quantity: z.string() }).parse(await req.json());
    return NextResponse.json(await new ReturnConsignmentItemUseCase().execute(id, quantity, session.user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
