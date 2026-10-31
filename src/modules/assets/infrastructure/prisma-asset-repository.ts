import type { Asset } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CleanAsset } from "../domain/asset";
import type { AssetRecord, AssetRepository } from "../repository/asset-repository";

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
      location: r.location,
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
}
