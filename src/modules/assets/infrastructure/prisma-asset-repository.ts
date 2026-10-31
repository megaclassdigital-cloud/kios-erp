import type { Asset } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CleanAsset } from "../domain/asset";
import type { AssetCategoryRecord, AssetRecord, AssetRepository } from "../repository/asset-repository";

export class PrismaAssetRepository implements AssetRepository {
  constructor(private readonly db: Db) {}

  private async toRecords(rows: (Asset & { createdBy: { name: string } })[]): Promise<AssetRecord[]> {
    const ids = [...new Set(rows.flatMap((r) => (r.updatedById ? [r.updatedById] : [])))];
    const users = ids.length ? await this.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const name = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      quantity: r.quantity,
      purchasePrice: r.purchasePrice.toString(),
      purchaseDate: r.purchaseDate,
      condition: r.condition,
      note: r.note,
      createdByName: r.createdBy.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      updatedByName: r.updatedById ? (name.get(r.updatedById) ?? null) : null,
    }));
  }

  async list(): Promise<AssetRecord[]> {
    const rows = await this.db.asset.findMany({
      where: { deletedAt: null },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    });
    return this.toRecords(rows);
  }

  async findById(id: string): Promise<AssetRecord | null> {
    const row = await this.db.asset.findFirst({ where: { id, deletedAt: null }, include: { createdBy: { select: { name: true } } } });
    return row ? (await this.toRecords([row]))[0] : null;
  }

  async create(data: CleanAsset, actorId: string): Promise<AssetRecord> {
    const row = await this.db.asset.create({ data: { ...data, createdById: actorId }, include: { createdBy: { select: { name: true } } } });
    return (await this.toRecords([row]))[0];
  }

  async update(id: string, data: CleanAsset, actorId: string): Promise<AssetRecord> {
    const row = await this.db.asset.update({ where: { id }, data: { ...data, updatedById: actorId }, include: { createdBy: { select: { name: true } } } });
    return (await this.toRecords([row]))[0];
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    await this.db.asset.update({ where: { id }, data: { deletedAt: new Date(), updatedById: actorId } });
  }

  async listCategories(): Promise<AssetCategoryRecord[]> {
    const [categories, used] = await Promise.all([
      this.db.assetCategory.findMany({ orderBy: { name: "asc" } }),
      this.db.asset.groupBy({ by: ["category"], where: { deletedAt: null }, _count: { _all: true } }),
    ]);
    const count = new Map(used.map((u) => [u.category, u._count._all]));
    return categories.map((c) => ({ id: c.id, name: c.name, assetCount: count.get(c.name) ?? 0 }));
  }

  async categoryExists(name: string): Promise<boolean> {
    return (await this.db.assetCategory.count({ where: { name } })) > 0;
  }

  async findCategory(id: string): Promise<AssetCategoryRecord | null> {
    const c = await this.db.assetCategory.findUnique({ where: { id } });
    if (!c) return null;
    const assetCount = await this.db.asset.count({ where: { category: c.name, deletedAt: null } });
    return { id: c.id, name: c.name, assetCount };
  }

  async createCategory(name: string): Promise<AssetCategoryRecord> {
    const c = await this.db.assetCategory.create({ data: { name } });
    return { id: c.id, name: c.name, assetCount: 0 };
  }

  async renameCategory(id: string, newName: string): Promise<void> {
    const c = await this.db.assetCategory.findUnique({ where: { id } });
    if (!c) return;
    await this.db.assetCategory.update({ where: { id }, data: { name: newName } });
    // Assets carry the name as text, so they follow the rename (deleted ones too, so history reads the same).
    await this.db.asset.updateMany({ where: { category: c.name }, data: { category: newName } });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db.assetCategory.delete({ where: { id } });
  }
}
