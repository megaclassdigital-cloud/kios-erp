import type { Expense, ExpenseCategory } from "@prisma/client";

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: string;
  description?: string;
  expenseDate: Date;
  createdById: string;
}

export interface ExpenseRepository {
  create(input: CreateExpenseInput): Promise<Expense>;
  listBetween(start: Date, end: Date): Promise<Expense[]>;
}
