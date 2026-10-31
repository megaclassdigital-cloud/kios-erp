import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  expenses: new Map<string, { id: string; category: string; amount: string; description: string | null; expenseDate: Date }>(),
  assets: [] as { name: string; category: string; quantity: number; purchasePrice: string; purchaseDate: Date; note: string | null }[],
  categories: ["Pendingin & Freezer"],
  audits: [] as { action: string; afterValue?: unknown }[],
}));

vi.mock("@/shared/infrastructure/transaction-manager", () => ({
  TransactionManager: class {
    run<T>(work: (tx: unknown) => Promise<T>) {
      return work({});
    }
  },
}));
vi.mock("@/shared/infrastructure/audit-logger", () => ({ AuditLogger: class { async record(e: { action: string }) { db.audits.push(e); } } }));
vi.mock("../infrastructure/prisma-expense-repository", () => ({
  PrismaExpenseRepository: class {
    async findById(id: string) { return db.expenses.get(id) ?? null; }
    async update(id: string, c: { category: string; amount: string; description: string | null; expenseDate: Date }) { const e = { ...db.expenses.get(id)!, ...c }; db.expenses.set(id, e); return e; }
    async delete(id: string) { db.expenses.delete(id); }
  },
}));
vi.mock("@/modules/assets/infrastructure/prisma-asset-repository", () => ({
  PrismaAssetRepository: class {
    async categoryExists(n: string) { return db.categories.includes(n); }
    async create(a: (typeof db.assets)[number]) { db.assets.push(a); return { id: "asset1" }; }
  },
}));

import { DeleteExpenseUseCase, ExpenseNotFoundError, MoveExpenseToAssetUseCase, UpdateExpenseUseCase } from "./expense-use-cases";

beforeEach(() => {
  db.expenses.clear();
  db.assets.length = 0;
  db.audits.length = 0;
  db.expenses.set("e1", { id: "e1", category: "OPERATIONAL", amount: "7000000", description: "Freezer box", expenseDate: new Date("2026-10-20T03:00:00Z") });
});

describe("expenses can be corrected after saving", () => {
  it("updates an expense and audits before and after", async () => {
    await new UpdateExpenseUseCase().execute("e1", { category: "OTHER", amount: "6500000", description: " Freezer ", expenseDate: "2026-10-21T00:00:00Z" }, "u");
    expect(db.expenses.get("e1")).toMatchObject({ category: "OTHER", amount: "6500000.00", description: "Freezer" });
    expect(db.audits.map((a) => a.action)).toEqual(["EXPENSE_UPDATED"]);
  });

  it("deletes it, leaving an audit copy", async () => {
    await new DeleteExpenseUseCase().execute("e1", "u");
    expect(db.expenses.has("e1")).toBe(false);
    expect(db.audits.map((a) => a.action)).toEqual(["EXPENSE_DELETED"]);
  });

  it("says so when the expense is gone", async () => {
    await expect(new DeleteExpenseUseCase().execute("nope", "u")).rejects.toThrow(ExpenseNotFoundError);
    await expect(new UpdateExpenseUseCase().execute("nope", { category: "OTHER", amount: "1", expenseDate: "2026-10-01" }, "u")).rejects.toThrow(ExpenseNotFoundError);
  });
});

describe("moving an expense to Aset Toko", () => {
  it("creates the asset with the expense's date and amount and removes the expense, atomically", async () => {
    await new MoveExpenseToAssetUseCase().execute("e1", { name: "Freezer Box 300L", category: "Pendingin & Freezer", quantity: 1 }, "u");
    expect(db.expenses.has("e1")).toBe(false);
    expect(db.assets).toHaveLength(1);
    expect(db.assets[0]).toMatchObject({ name: "Freezer Box 300L", quantity: 1, purchasePrice: "7000000.00" });
    expect(db.assets[0].purchaseDate.toISOString()).toBe("2026-10-20T03:00:00.000Z");
    expect(db.assets[0].note).toContain("Dipindahkan dari pengeluaran 2026-10-20");
    expect(db.audits.map((a) => a.action)).toEqual(["EXPENSE_MOVED_TO_ASSET"]);
  });

  it("splits the amount over the units: 2 units from 7.000.000 is 3.500.000 each", async () => {
    await new MoveExpenseToAssetUseCase().execute("e1", { name: "Rak", category: "Pendingin & Freezer", quantity: 2 }, "u");
    expect(db.assets[0]).toMatchObject({ quantity: 2, purchasePrice: "3500000.00" });
  });

  it("changes nothing when the category is unknown or the quantity is bad", async () => {
    await expect(new MoveExpenseToAssetUseCase().execute("e1", { name: "X", category: "Tidak ada", quantity: 1 }, "u")).rejects.toThrow(/Kategori/);
    await expect(new MoveExpenseToAssetUseCase().execute("e1", { name: "X", category: "Pendingin & Freezer", quantity: 0 }, "u")).rejects.toThrow(/bulat/);
    await expect(new MoveExpenseToAssetUseCase().execute("e1", { name: " ", category: "Pendingin & Freezer", quantity: 1 }, "u")).rejects.toThrow(/Nama aset/);
    expect(db.expenses.has("e1")).toBe(true);
    expect(db.assets).toHaveLength(0);
  });
});
