import type { ExpenseCategory } from "@prisma/client";
import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaExpenseRepository } from "../infrastructure/prisma-expense-repository";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";

export class CreateExpenseUseCase {
  async execute(input: {
    category: ExpenseCategory;
    amount: string;
    description?: string;
    expenseDate: Date;
    createdById: string;
  }) {
    const expenses = new PrismaExpenseRepository(prisma);
    const expense = await expenses.create(input);
    const audit = new AuditLogger(prisma);
    await audit.record({
      actorId: input.createdById,
      action: "EXPENSE_CREATED",
      entityType: "Expense",
      entityId: expense.id,
      afterValue: { category: input.category, amount: input.amount },
    });
    return expense;
  }
}
