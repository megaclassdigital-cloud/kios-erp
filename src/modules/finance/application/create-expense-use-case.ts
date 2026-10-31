import type { ExpenseCategory } from "@prisma/client";
import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaExpenseRepository } from "../infrastructure/prisma-expense-repository";
import { cleanExpense } from "../domain/expense";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";

export class CreateExpenseUseCase {
  async execute(input: {
    category: ExpenseCategory;
    amount: string;
    description?: string;
    expenseDate: Date;
    createdById: string;
  }) {
    const clean = cleanExpense(input);
    const expenses = new PrismaExpenseRepository(prisma);
    const expense = await expenses.create({
      category: clean.category,
      amount: clean.amount,
      description: clean.description ?? undefined,
      expenseDate: clean.expenseDate,
      createdById: input.createdById,
    });
    const audit = new AuditLogger(prisma);
    await audit.record({
      actorId: input.createdById,
      action: "EXPENSE_CREATED",
      entityType: "Expense",
      entityId: expense.id,
      afterValue: { category: clean.category, amount: clean.amount },
    });
    return expense;
  }
}
