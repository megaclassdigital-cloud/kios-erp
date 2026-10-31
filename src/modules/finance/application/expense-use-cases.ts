import Decimal from "decimal.js";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { cleanAsset, InvalidAssetError } from "@/modules/assets/domain/asset";
import { PrismaAssetRepository } from "@/modules/assets/infrastructure/prisma-asset-repository";
import { CONDITION_LABEL } from "@/modules/assets/domain/asset";
import { cleanExpense, InvalidExpenseError, type ExpenseInput } from "../domain/expense";
import { PrismaExpenseRepository } from "../infrastructure/prisma-expense-repository";

export class ExpenseNotFoundError extends Error {}

const snapshot = (e: { category: string; amount: { toString(): string }; description: string | null; expenseDate: Date }) => ({
  category: e.category,
  amount: e.amount.toString(),
  description: e.description,
  expenseDate: e.expenseDate.toISOString(),
});

/** Correct a saved expense. The audit row keeps what it said before. */
export class UpdateExpenseUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, input: ExpenseInput, actorId: string) {
    return this.txManager.run(async (tx) => {
      const expenses = new PrismaExpenseRepository(tx);
      const before = await expenses.findById(id);
      if (!before) throw new ExpenseNotFoundError("Pengeluaran tidak ditemukan.");
      const clean = cleanExpense(input, before.category);
      const after = await expenses.update(id, clean);
      await new AuditLogger(tx).record({
        actorId,
        action: "EXPENSE_UPDATED",
        entityType: "Expense",
        entityId: id,
        beforeValue: snapshot(before),
        afterValue: snapshot(after),
      });
      return after;
    });
  }
}

/** Remove a wrongly entered expense. The record is gone from the totals; the audit row keeps a full copy. */
export class DeleteExpenseUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const expenses = new PrismaExpenseRepository(tx);
      const before = await expenses.findById(id);
      if (!before) throw new ExpenseNotFoundError("Pengeluaran tidak ditemukan.");
      await expenses.delete(id);
      await new AuditLogger(tx).record({ actorId, action: "EXPENSE_DELETED", entityType: "Expense", entityId: id, beforeValue: snapshot(before) });
    });
  }
}

export interface MoveToAssetInput {
  name: string;
  category: string;
  quantity: number | string;
}

/**
 * An expense that was really a purchase of equipment: it becomes an asset and
 * leaves the expenses, in one transaction, so the money is never counted in
 * both places and never in neither. The asset keeps the expense's date and its
 * full amount (per-unit price = amount / quantity), plus a note saying where
 * it came from; the audit row keeps a copy of the expense.
 */
export class MoveExpenseToAssetUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, input: MoveToAssetInput, actorId: string) {
    return this.txManager.run(async (tx) => {
      const expenses = new PrismaExpenseRepository(tx);
      const assets = new PrismaAssetRepository(tx);
      const expense = await expenses.findById(id);
      if (!expense) throw new ExpenseNotFoundError("Pengeluaran tidak ditemukan.");

      const quantity = Number(input.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) throw new InvalidExpenseError("Jumlah unit harus bilangan bulat, minimal 1.");
      const unitPrice = new Decimal(expense.amount.toString()).div(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      const clean = cleanAsset({
        name: input.name,
        category: input.category,
        quantity,
        purchasePrice: unitPrice.toString(),
        purchaseDate: expense.expenseDate.toISOString(),
        condition: "BAIK" as keyof typeof CONDITION_LABEL,
        note: `Dipindahkan dari pengeluaran ${expense.expenseDate.toISOString().slice(0, 10)} (Rp${Number(expense.amount).toLocaleString("id-ID")})`,
      });
      if (!(await assets.categoryExists(clean.category))) {
        throw new InvalidAssetError("Kategori aset tidak ada. Pilih dari daftar, atau tambah kategorinya di halaman Aset Toko.");
      }

      const asset = await assets.create(clean, actorId);
      await expenses.delete(id);
      await new AuditLogger(tx).record({
        actorId,
        action: "EXPENSE_MOVED_TO_ASSET",
        entityType: "Expense",
        entityId: id,
        beforeValue: snapshot(expense),
        afterValue: { assetId: asset.id, assetName: clean.name, quantity, unitPrice: unitPrice.toString() },
      });
      return asset;
    });
  }
}
