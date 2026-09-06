import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PrismaShiftRepository } from "@/modules/pos/infrastructure/prisma-shift-repository";
import { prisma } from "@/shared/infrastructure/prisma";

export async function GET() {
  try {
    const session = await requireSession("pos.shift");
    const shifts = new PrismaShiftRepository(prisma);
    const shift = await shifts.findOpenForCashier(session.user.id);
    return NextResponse.json({ shift });
  } catch (error) {
    return toErrorResponse(error);
  }
}
