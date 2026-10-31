import type { Expense } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CreateExpenseInput, ExpenseChange, ExpenseRepository } from "../repository/expense-repository";

export class PrismaExpenseRepository implements ExpenseRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateExpenseInput): Promise<Expense> {
    return this.db.expense.create({ data: input });
  }

  async findById(id: string): Promise<Expense | null> {
    return this.db.expense.findUnique({ where: { id } });
  }

  async update(id: string, change: ExpenseChange): Promise<Expense> {
    return this.db.expense.update({ where: { id }, data: change });
  }

  async delete(id: string): Promise<void> {
    await this.db.expense.delete({ where: { id } });
  }

  async listBetween(start: Date, end: Date): Promise<Expense[]> {
    return this.db.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
      orderBy: { expenseDate: "desc" },
    });
  }
}
