import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { cleanCategoryName, InvalidAssetError } from "../domain/asset";
import { PrismaAssetRepository } from "../infrastructure/prisma-asset-repository";
import type { AssetRepository } from "../repository/asset-repository";

export class AssetCategoryNotFoundError extends Error {}

/** Names are unique ignoring case ("alat dapur" is "Alat Dapur"). */
async function assertNameFree(repo: AssetRepository, name: string, exceptId?: string) {
  const clash = (await repo.listCategories()).find((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== exceptId);
  if (clash) throw new InvalidAssetError(`Kategori "${clash.name}" sudah ada.`);
}

export class CreateAssetCategoryUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(rawName: string, actorId: string) {
    const name = cleanCategoryName(rawName);
    return this.txManager.run(async (tx) => {
      const repo = new PrismaAssetRepository(tx);
      await assertNameFree(repo, name);
      const category = await repo.createCategory(name);
      await new AuditLogger(tx).record({ actorId, action: "ASSET_CATEGORY_CREATED", entityType: "AssetCategory", entityId: category.id, afterValue: { name } });
      return category;
    });
  }
}

/** Renaming also renames the category on every asset that uses it. */
export class RenameAssetCategoryUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, rawName: string, actorId: string) {
    const name = cleanCategoryName(rawName);
    return this.txManager.run(async (tx) => {
      const repo = new PrismaAssetRepository(tx);
      const before = await repo.findCategory(id);
      if (!before) throw new AssetCategoryNotFoundError("Kategori tidak ditemukan.");
      await assertNameFree(repo, name, id);
      await repo.renameCategory(id, name);
      await new AuditLogger(tx).record({
        actorId,
        action: "ASSET_CATEGORY_RENAMED",
        entityType: "AssetCategory",
        entityId: id,
        beforeValue: { name: before.name },
        afterValue: { name },
        metadata: { assetsUpdated: before.assetCount },
      });
    });
  }
}

/** A category still in use cannot go: its assets would be left without one. */
export class DeleteAssetCategoryUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const repo = new PrismaAssetRepository(tx);
      const category = await repo.findCategory(id);
      if (!category) throw new AssetCategoryNotFoundError("Kategori tidak ditemukan.");
      if (category.assetCount > 0) {
        throw new InvalidAssetError(`Kategori "${category.name}" masih dipakai ${category.assetCount} aset. Pindahkan asetnya ke kategori lain dulu.`);
      }
      await repo.deleteCategory(id);
      await new AuditLogger(tx).record({ actorId, action: "ASSET_CATEGORY_DELETED", entityType: "AssetCategory", entityId: id, beforeValue: { name: category.name } });
    });
  }
}
