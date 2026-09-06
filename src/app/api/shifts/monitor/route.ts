import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { prisma } from "@/shared/infrastructure/prisma";

/** Cross-cashier shift monitoring for owner/admin (PRD 4, 53) — who's
 * currently on shift, opening cash, and running sales total. */
export async function GET() {
  try {
    await requireSession("shifts.monitor");
    const shifts = await prisma.cashierShift.findMany({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
      include: {
        cashier: { select: { name: true, username: true } },
        sales: {
          where: { status: "PAID" },
          select: { grandTotal: true, paymentMethod: true },
        },
      },
    });

    const result = shifts.map((shift) => {
      const cashSales = shift.sales
        .filter((s) => s.paymentMethod === "CASH")
        .reduce((acc, s) => acc + Number(s.grandTotal), 0);
      const cashlessSales = shift.sales
        .filter((s) => s.paymentMethod === "CASHLESS")
        .reduce((acc, s) => acc + Number(s.grandTotal), 0);
      return {
        id: shift.id,
        cashier: shift.cashier.name,
        openingCash: shift.openingCash.toString(),
        openedAt: shift.openedAt,
        transactionCount: shift.sales.length,
        cashSales: cashSales.toFixed(2),
        cashlessSales: cashlessSales.toFixed(2),
      };
    });

    return NextResponse.json({ shifts: result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
