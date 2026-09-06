import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { hasPermission } from "@/shared/security/permissions";
import { PrismaSaleRepository } from "@/modules/pos/infrastructure/prisma-sale-repository";
import { prisma } from "@/shared/infrastructure/prisma";

/** Kasir sees only their own transactions; owner/admin (transactions.view_all)
 * see every cashier's — this is the "monitoring" view for management (PRD 4, 47). */
export async function GET() {
  try {
    const session = await requireSession("transactions.view");
    const repo = new PrismaSaleRepository(prisma);
    const seeAll = hasPermission(session.user.role, "transactions.view_all");
    const sales = await repo.listRecent(100, seeAll ? undefined : session.user.id);
    return NextResponse.json({ sales });
  } catch (error) {
    return toErrorResponse(error);
  }
}
