import type { Expense, ExpenseCategory } from "@prisma/client";

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: string;
  description?: string;
  expenseDate: Date;
  createdById: string;
}

export interface ExpenseChange {
  category: ExpenseCategory;
  amount: string;
  description: string | null;
  expenseDate: Date;
}

export interface ExpenseRepository {
  create(input: CreateExpenseInput): Promise<Expense>;
  findById(id: string): Promise<Expense | null>;
  update(id: string, change: ExpenseChange): Promise<Expense>;
  delete(id: string): Promise<void>;
  listBetween(start: Date, end: Date): Promise<Expense[]>;
}
