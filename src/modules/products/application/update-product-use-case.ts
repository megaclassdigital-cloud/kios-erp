import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { DuplicateProductError } from "../domain/duplicate-product-error";
import { findReminders, needsAcknowledgement, reminderMessage } from "../domain/similar-products";
import { PrismaProductRepository } from "../infrastructure/prisma-product-repository";

export interface UpdateProductRequest {
  name?: string;
  categoryId?: string | null;
  purchasePrice?: string;
  sellingPrice?: string;
  minimumStock?: number;
  active?: boolean;
  serviceProvider?: string | null;
  expiryDate?: Date | null;
  expiryWarnDays?: number;
  /** The user saw the similar-name reminder and confirmed the new name is deliberate. */
  acknowledgeSimilar?: boolean;
  isConsignment?: boolean;
  consignorId?: string | null;
}

export class ProductNotFoundError extends Error {}

/**
 * Edits a product's own fields. Never touches its barcode, its id, or any
 * historical sale: every SaleItem carries its own price and cost snapshot, so
 * changing the price today cannot rewrite last month's profit.
 *
 * The audit entry records the fields that cost money if they move — price,
 * and now expiry, which decides whether the till lets an item be sold at all.
 * The write and the audit row go in one transaction, so there is no path that
 * changes a price without leaving a trace of who changed it.
 */
export class UpdateProductUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(id: string, { acknowledgeSimilar, ...req }: UpdateProductRequest, actorId: string) {
    return this.txManager.run(async (tx) => {
      const products = new PrismaProductRepository(tx);
      const audit = new AuditLogger(tx);

      const before = await products.findById(id);
      if (!before) throw new ProductNotFoundError("Produk tidak ditemukan.");

      // Renaming onto another product's name would recreate the duplicate that
      // adding refuses.
      if (req.name !== undefined) {
        const others = (await products.listForDuplicateCheck()).filter((p) => p.id !== id);
        const reminders = findReminders(others, { name: req.name });
        if (needsAcknowledgement(reminders) && !acknowledgeSimilar) {
          throw new DuplicateProductError(reminderMessage(reminders));
        }
      }

      // Whose goods these are can only change while there is nothing to account for:
      // no stock on the shelf and no drop-off on record, or the owed amounts would be wrong.
      const consignmentChanging =
        (req.isConsignment !== undefined && req.isConsignment !== before.isConsignment) ||
        (req.consignorId !== undefined && req.consignorId !== before.consignorId);
      if (consignmentChanging) {
        if (before.productType === "SERVICE") throw new Error("Layanan tidak bisa menjadi barang titipan.");
        if (Number(before.currentStock) !== 0) {
          throw new Error("Status titipan hanya bisa diubah saat stok 0. Habiskan, retur, atau catat keluar stoknya dulu.");
        }
        if (await products.hasConsignmentHistory(id)) {
          throw new Error("Barang ini sudah punya riwayat titipan, jadi status penitipnya tidak bisa diubah.");
        }
        if (req.isConsignment && !(req.consignorId ?? before.consignorId)) throw new Error("Pilih penitip untuk barang titipan.");
      }

      // A service has nothing physical to expire, so a date sent for one is
      // dropped rather than stored and later shown as a warning about pulsa
      // going off — same rule as when the product was created.
      const expiryDate =
        before.productType === "SERVICE" ? null : req.expiryDate;

      const product = await products.update(id, {
        ...req,
        expiryDate,
        ...(req.isConsignment === false ? { consignorId: null } : {}),
      });

      await audit.record({
        actorId,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: id,
        beforeValue: {
          name: before.name,
          purchasePrice: before.purchasePrice.toString(),
          sellingPrice: before.sellingPrice.toString(),
          expiryDate: before.expiryDate?.toISOString() ?? null,
          active: before.active,
        },
        afterValue: {
          name: product.name,
          purchasePrice: product.purchasePrice.toString(),
          sellingPrice: product.sellingPrice.toString(),
          expiryDate: product.expiryDate?.toISOString() ?? null,
          active: product.active,
        },
      });

      return product;
    });
  }
}
