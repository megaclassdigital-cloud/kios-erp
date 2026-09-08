import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { hasPermission } from "@/shared/security/permissions";
import { prisma } from "@/shared/infrastructure/prisma";

/** PRD 47: transaction detail — item price/cost snapshot, payment, and
 * stock movement references. Kasir may only open their own sales unless
 * they hold transactions.view_all. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("transactions.view");
    const { id } = await params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { serviceDetail: true } },
        payments: true,
        cashier: { select: { name: true } },
      },
    });
    if (!sale) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    }

    const seeAll = hasPermission(session.user.role, "transactions.view_all");
    if (!seeAll && sale.cashierId !== session.user.id) {
      return NextResponse.json({ error: "Anda tidak memiliki izin untuk melihat transaksi ini." }, { status: 403 });
    }

    const stockMovements = await prisma.stockMovement.findMany({
      where: { referenceType: { in: ["SALE", "REFUND"] }, referenceId: sale.id },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ sale, stockMovements });
  } catch (error) {
    return toErrorResponse(error);
  }
}
