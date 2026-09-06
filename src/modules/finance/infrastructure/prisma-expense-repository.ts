import type { Expense } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CreateExpenseInput, ExpenseRepository } from "../repository/expense-repository";

export class PrismaExpenseRepository implements ExpenseRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateExpenseInput): Promise<Expense> {
    return this.db.expense.create({ data: input });
  }

  async listBetween(start: Date, end: Date): Promise<Expense[]> {
    return this.db.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
      orderBy: { expenseDate: "desc" },
    });
  }
}
