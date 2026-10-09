import type { Db } from "@/shared/infrastructure/transaction-manager";
import { changedProductFields } from "../domain/product-change";
import type { ProductActivity, ProductActivityRepository } from "../repository/product-activity-repository";

/**
 * Reads "what last happened to each product" from the two records that
 * already exist for it: the stock ledger and the audit trail. Nothing new is
 * written, so the log cannot drift from what actually happened.
 */
export class PrismaProductActivityRepository implements ProductActivityRepository {
  constructor(private readonly db: Db) {}

  async latestFor(productIds: string[]): Promise<Map<string, ProductActivity>> {
    const result = new Map<string, ProductActivity>();
    if (productIds.length === 0) return result;

    const [movements, edits] = await Promise.all([
      this.db.$queryRaw<{ productId: string; createdAt: Date; movementType: string }[]>`
        SELECT DISTINCT ON ("productId") "productId", "createdAt", "movementType"::text AS "movementType"
        FROM stock_movements
        WHERE "productId" = ANY(${productIds}::text[])
        ORDER BY "productId", "createdAt" DESC`,
      this.db.$queryRaw<
        { entityId: string; createdAt: Date; action: string; beforeValue: unknown; afterValue: unknown; name: string }[]
      >`
        SELECT DISTINCT ON (a."entityId") a."entityId", a."createdAt", a.action,
               a."beforeValue", a."afterValue", u.name
        FROM audit_logs a
        JOIN users u ON u.id = a."actorId"
        WHERE a."entityType" = 'Product'
          AND a.action IN ('PRODUCT_CREATED', 'PRODUCT_UPDATED')
          AND a."entityId" = ANY(${productIds}::text[])
        ORDER BY a."entityId", a."createdAt" DESC`,
    ]);

    const entry = (id: string): ProductActivity => {
      const existing = result.get(id);
      if (existing) return existing;
      const fresh: ProductActivity = { lastStockChange: null, lastEdit: null };
      result.set(id, fresh);
      return fresh;
    };

    for (const m of movements) entry(m.productId).lastStockChange = { at: m.createdAt, type: m.movementType };
    for (const e of edits) {
      entry(e.entityId).lastEdit = {
        at: e.createdAt,
        by: e.name,
        created: e.action === "PRODUCT_CREATED",
        changed: changedProductFields(e.beforeValue, e.afterValue),
      };
    }
    return result;
  }
}
