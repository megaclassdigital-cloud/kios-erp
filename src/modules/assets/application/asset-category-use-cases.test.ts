import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  categories: [] as { id: string; name: string }[],
  assets: [] as { category: string }[],
  audits: [] as string[],
}));

vi.mock("@/shared/infrastructure/transaction-manager", () => ({
  TransactionManager: class {
    run<T>(work: (tx: unknown) => Promise<T>) {
      return work({});
    }
  },
}));
vi.mock("@/shared/infrastructure/audit-logger", () => ({ AuditLogger: class { async record(e: { action: string }) { db.audits.push(e.action); } } }));
vi.mock("../infrastructure/prisma-asset-repository", () => ({
  PrismaAssetRepository: class {
    private count = (name: string) => db.assets.filter((a) => a.category === name).length;
    async listCategories() { return db.categories.map((c) => ({ ...c, assetCount: this.count(c.name) })); }
    async findCategory(id: string) { const c = db.categories.find((x) => x.id === id); return c ? { ...c, assetCount: this.count(c.name) } : null; }
    async createCategory(name: string) { const c = { id: `c${db.categories.length + 1}`, name }; db.categories.push(c); return { ...c, assetCount: 0 }; }
    async renameCategory(id: string, name: string) {
      const c = db.categories.find((x) => x.id === id)!;
      db.assets.forEach((a) => { if (a.category === c.name) a.category = name; });
      c.name = name;
    }
    async deleteCategory(id: string) { db.categories = db.categories.filter((c) => c.id !== id); }
  },
}));

import { CreateAssetCategoryUseCase, DeleteAssetCategoryUseCase, RenameAssetCategoryUseCase } from "./asset-category-use-cases";

beforeEach(() => {
  db.categories = [{ id: "c1", name: "Rak & Perabot" }];
  db.assets = [{ category: "Rak & Perabot" }, { category: "Rak & Perabot" }];
  db.audits.length = 0;
});

describe("asset categories", () => {
  it("adds a category, refusing a duplicate ignoring case", async () => {
    await new CreateAssetCategoryUseCase().execute("  Alat   Dapur ", "u");
    expect(db.categories.map((c) => c.name)).toContain("Alat Dapur");
    await expect(new CreateAssetCategoryUseCase().execute("alat dapur", "u")).rejects.toThrow(/sudah ada/);
  });

  it("renaming carries every asset with it", async () => {
    await new RenameAssetCategoryUseCase().execute("c1", "Perabot Toko", "u");
    expect(db.assets.every((a) => a.category === "Perabot Toko")).toBe(true);
    expect(db.audits).toEqual(["ASSET_CATEGORY_RENAMED"]);
  });

  it("will not rename onto another category's name", async () => {
    db.categories.push({ id: "c2", name: "Kendaraan" });
    await expect(new RenameAssetCategoryUseCase().execute("c1", "kendaraan", "u")).rejects.toThrow(/sudah ada/);
  });

  it("refuses to delete a category in use, and deletes an empty one", async () => {
    await expect(new DeleteAssetCategoryUseCase().execute("c1", "u")).rejects.toThrow(/masih dipakai 2 aset/);
    db.assets = [];
    await new DeleteAssetCategoryUseCase().execute("c1", "u");
    expect(db.categories).toEqual([]);
  });
});
