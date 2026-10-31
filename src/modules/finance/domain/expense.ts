import Decimal from "decimal.js";
import type { ExpenseCategory } from "@prisma/client";

export class InvalidExpenseError extends Error {}

/** What a new expense may be. SUPPLIER is not here on purpose (stock bought from
 * a supplier is already counted when it sells); an old record that has it can
 * keep it while being edited, see `cleanExpense`. */
export const EXPENSE_CATEGORIES = ["ELECTRICITY", "TRANSPORT", "SALARY", "OPERATIONAL", "OTHER"] as const;

export interface ExpenseInput {
  category: ExpenseCategory;
  amount: string;
  description?: string;
  expenseDate: string | Date;
}

export interface CleanExpense {
  category: ExpenseCategory;
  amount: string;
  description: string | null;
  expenseDate: Date;
}

/**
 * Validation shared by adding and correcting an expense. `keepCategory` is the
 * category the record already has: it may stay even if it is no longer offered
 * (the legacy SUPPLIER), but nothing can be switched *to* it.
 */
export function cleanExpense(input: ExpenseInput, keepCategory?: ExpenseCategory, now = new Date()): CleanExpense {
  const allowed = (EXPENSE_CATEGORIES as readonly string[]).includes(input.category) || input.category === keepCategory;
  if (!allowed) throw new InvalidExpenseError("Kategori pengeluaran tidak valid.");

  let amount: Decimal;
  try {
    amount = new Decimal(input.amount);
  } catch {
    throw new InvalidExpenseError("Jumlah harus berupa angka.");
  }
  if (!amount.isFinite() || amount.lte(0)) throw new InvalidExpenseError("Jumlah harus lebih dari 0.");
  if (amount.decimalPlaces() > 2) throw new InvalidExpenseError("Jumlah maksimal 2 angka di belakang koma.");

  const date = new Date(input.expenseDate);
  if (Number.isNaN(date.getTime())) throw new InvalidExpenseError("Tanggal tidak valid.");
  if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) throw new InvalidExpenseError("Tanggal tidak boleh di masa depan.");

  const description = input.description?.trim() ?? "";
  if (description.length > 300) throw new InvalidExpenseError("Keterangan maksimal 300 huruf.");

  return { category: input.category, amount: amount.toFixed(2), description: description || null, expenseDate: date };
}
