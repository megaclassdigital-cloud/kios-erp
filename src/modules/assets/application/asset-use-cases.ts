import { prisma } from "@/shared/infrastructure/prisma";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { cleanAsset, summarizeAssets, type AssetInput } from "../domain/asset";
import { PrismaAssetRepository } from "../infrastructure/prisma-asset-repository";

export class AssetNotFoundError extends Error {}

/** The register plus its recap, from one read so they always agree. */
export class ListAssetsUseCase {
  async execute() {
    const assets = await new PrismaAssetRepository(prisma).list();
    return { assets, summary: summarizeAssets(assets) };
  }
}

export class CreateAssetUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(input: AssetInput, actorId: string) {
    const clean = cleanAsset(input);
    return this.txManager.run(async (tx) => {
      const asset = await new PrismaAssetRepository(tx).create(clean, actorId);
      await new AuditLogger(tx).record({
        actorId,
        action: "ASSET_CREATED",
        entityType: "Asset",
        entityId: asset.id,
        afterValue: { name: clean.name, quantity: clean.quantity, purchasePrice: clean.purchasePrice },
      });
      return asset;
    });
  }
}

export class UpdateAssetUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, input: AssetInput, actorId: string) {
    const clean = cleanAsset(input);
    return this.txManager.run(async (tx) => {
      const assets = new PrismaAssetRepository(tx);
      const before = await assets.findById(id);
      if (!before) throw new AssetNotFoundError("Aset tidak ditemukan.");
      const asset = await assets.update(id, clean, actorId);
      await new AuditLogger(tx).record({
        actorId,
        action: "ASSET_UPDATED",
        entityType: "Asset",
        entityId: id,
        beforeValue: { name: before.name, quantity: before.quantity, purchasePrice: before.purchasePrice, condition: before.condition },
        afterValue: { name: clean.name, quantity: clean.quantity, purchasePrice: clean.purchasePrice, condition: clean.condition },
      });
      return asset;
    });
  }
}

export class DeleteAssetUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const assets = new PrismaAssetRepository(tx);
      const before = await assets.findById(id);
      if (!before) throw new AssetNotFoundError("Aset tidak ditemukan.");
      await assets.softDelete(id, actorId);
      await new AuditLogger(tx).record({
        actorId,
        action: "ASSET_DELETED",
        entityType: "Asset",
        entityId: id,
        beforeValue: { name: before.name, quantity: before.quantity, purchasePrice: before.purchasePrice },
      });
    });
  }
}
