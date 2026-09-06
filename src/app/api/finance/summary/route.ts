import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";

export async function GET(req: NextRequest) {
  try {
    await requireSession("finance.manage");
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start")
      ? new Date(searchParams.get("start")!)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const end = searchParams.get("end") ? new Date(searchParams.get("end")!) : new Date();

    const useCase = new GetFinancialSummaryUseCase();
    const summary = await useCase.execute(start, end);
    return NextResponse.json({
      revenue: summary.revenue.toFixed(2),
      cogs: summary.cogs.toFixed(2),
      grossProfit: summary.grossProfit.toFixed(2),
      expense: summary.expense.toFixed(2),
      operationalProfit: summary.operationalProfit.toFixed(2),
      cash: summary.cash.toFixed(2),
      cashless: summary.cashless.toFixed(2),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
