import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { CreateExpenseUseCase } from "@/modules/finance/application/create-expense-use-case";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({
  category: z.enum(["SUPPLIER", "ELECTRICITY", "TRANSPORT", "SALARY", "OPERATIONAL", "OTHER"]),
  amount: z.string(),
  description: z.string().optional(),
  expenseDate: z.string(),
});

export async function GET() {
  try {
    await requireSession("finance.manage");
    const expenses = await prisma.expense.findMany({ orderBy: { expenseDate: "desc" }, take: 100 });
    return NextResponse.json({ expenses });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("finance.manage");
    const body = schema.parse(await req.json());
    const useCase = new CreateExpenseUseCase();
    const expense = await useCase.execute({
      ...body,
      expenseDate: new Date(body.expenseDate),
      createdById: session.user.id,
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
