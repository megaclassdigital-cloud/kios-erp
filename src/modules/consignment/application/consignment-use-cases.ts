import Decimal from "decimal.js";
import { prisma } from "@/shared/infrastructure/prisma";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { DailyCounterRepository } from "@/shared/infrastructure/daily-counter-repository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { PrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { moveStock } from "@/modules/inventory/application/move-stock";
import {
  buildConsignorPositions,
  cleanDropLines,
  cleanCatchUpQuantity,
  cleanPayment,
  cleanReturnQuantity,
  InvalidConsignmentError,
  returnableUnits,
  type DropLineInput,
} from "../domain/consignment";
import { PrismaConsignmentRepository } from "../infrastructure/prisma-consignment-repository";

export class ConsignmentNotFoundError extends Error {}

export const CONSIGNMENT_REFERENCE = "CONSIGNMENT";
export const CONSIGNMENT_RETURN_REFERENCE = "CONSIGNMENT_RETURN";

/** What the page shows: every consignor's position, the drop-offs and the payments. */
export class GetConsignmentOverviewUseCase {
  async execute() {
    const repo = new PrismaConsignmentRepository(prisma);
    const [data, drops, payments, suppliers] = await Promise.all([
      repo.positionData(),
      repo.listDrops(50),
      repo.listPayments(50),
      prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    return { consignors: buildConsignorPositions(data), drops, payments, suppliers };
  }
}

export interface ReceiveConsignmentRequest {
  supplierId: string;
  note?: string;
  lines: DropLineInput[];
  actorId: string;
}

/**
 * A rep drops goods off. Stock goes up through the normal ledger (a movement
 * per line, in the same transaction as the projection), the consignor's price
 * becomes the product's buy price so every sale carries the right cost, and
 * nothing is booked as an expense: the shop owes money only once units sell.
 */
export class ReceiveConsignmentUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(req: ReceiveConsignmentRequest) {
    const lines = cleanDropLines(req.lines);

    return this.txManager.run(async (tx) => {
      const repo = new PrismaConsignmentRepository(tx);
      const products = new PrismaProductRepository(tx);
      const inventory = new PrismaInventoryRepository(tx);

      const supplier = await repo.findSupplier(req.supplierId);
      if (!supplier || !supplier.active) throw new InvalidConsignmentError("Penitip tidak ditemukan atau tidak aktif.");

      const found = await products.findByIds(lines.map((l) => l.productId));
      const byId = new Map(found.map((p) => [p.id, p]));
      for (const line of lines) {
        const p = byId.get(line.productId);
        if (!p || p.deletedAt || !p.active) throw new InvalidConsignmentError("Salah satu barang tidak ditemukan atau tidak aktif.");
        if (!p.trackInventory) throw new InvalidConsignmentError(`${p.name} tidak memiliki stok.`);
        if (!p.isConsignment) {
          throw new InvalidConsignmentError(`${p.name} belum ditandai sebagai barang titipan. Tandai dulu di Master Produk (pilihan Barang titipan), atau buat produk titipan yang baru.`);
        }
        if (p.consignorId !== req.supplierId) {
          throw new InvalidConsignmentError(`${p.name} terdaftar sebagai titipan penitip lain. Satu barang titipan hanya punya satu penitip.`);
        }
      }

      const number = await new DailyCounterRepository(tx).next("TTP");
      const consignment = await repo.createConsignment({
        number,
        supplierId: req.supplierId,
        receivedById: req.actorId,
        note: req.note?.trim() || null,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      });

      const warnings: string[] = [];
      const priceChanges: { product: string; from: string; to: string }[] = [];
      const sellingChanges: { product: string; from: string; to: string }[] = [];
      for (const line of lines) {
        const p = byId.get(line.productId)!;
        await inventory.recordMovement({
          productId: p.id,
          quantity: line.quantity,
          movementType: "PURCHASE",
          referenceType: CONSIGNMENT_REFERENCE,
          referenceId: consignment.id,
          actorId: req.actorId,
          note: `Titipan ${number} dari ${supplier.name}`,
        });
        await products.incrementStock(p.id, line.quantity);

        // Cost of goods sold follows the product's buy price, so it must be the consignor's price.
        const current = new Decimal(p.purchasePrice.toString());
        if (!current.eq(line.unitCost)) {
          await products.update(p.id, { purchasePrice: line.unitCost });
          priceChanges.push({ product: p.name, from: current.toFixed(2), to: line.unitCost });
        }
        // The shop is upping the consignor's price, so the selling price is set here too.
        const selling = line.sellingPrice ?? new Decimal(p.sellingPrice.toString()).toFixed(2);
        if (line.sellingPrice && !new Decimal(p.sellingPrice.toString()).eq(line.sellingPrice)) {
          await products.update(p.id, { sellingPrice: line.sellingPrice });
          sellingChanges.push({ product: p.name, from: new Decimal(p.sellingPrice.toString()).toFixed(2), to: line.sellingPrice });
        }
        if (new Decimal(selling).lte(line.unitCost)) {
          warnings.push(`Harga jual ${p.name} (Rp${Math.round(Number(selling)).toLocaleString("id-ID")}) tidak lebih tinggi dari harga titip. Cek harga jual di Master Produk.`);
        }
      }

      await new AuditLogger(tx).record({
        actorId: req.actorId,
        action: "CONSIGNMENT_RECEIVED",
        entityType: "Consignment",
        entityId: consignment.id,
        afterValue: { number, supplier: supplier.name, lines: lines.length },
        metadata: { priceChanges, sellingChanges },
      });
      return { consignment, warnings };
    });
  }
}

/** Unsold units go back to the consignor: stock goes down by a RETURN_OUT movement. Sold units never can. */
export class ReturnConsignmentItemUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(itemId: string, rawQuantity: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const repo = new PrismaConsignmentRepository(tx);
      const item = await repo.findItem(itemId);
      if (!item) throw new ConsignmentNotFoundError("Barang titipan tidak ditemukan.");

      const available = returnableUnits(
        { quantity: item.quantity.toString(), quantityReturned: item.quantityReturned.toString() },
        item.product.currentStock.toString()
      );
      const quantity = cleanReturnQuantity(rawQuantity, available);

      await moveStock(
        tx,
        { productId: item.productId, productName: item.product.name },
        `-${quantity}`,
        CONSIGNMENT_RETURN_REFERENCE,
        item.consignmentId,
        actorId,
        `Retur titipan ${item.consignment.number}: ${quantity}`,
        "RETURN_OUT"
      );
      await repo.addReturned(itemId, quantity);
      await new AuditLogger(tx).record({
        actorId,
        action: "CONSIGNMENT_RETURNED",
        entityType: "Consignment",
        entityId: item.consignmentId,
        afterValue: { product: item.product.name, quantity },
      });
      return { quantity };
    });
  }
}

export const CONSIGNMENT_CATCHUP_REFERENCE = "CONSIGNMENT_CATCHUP";

/**
 * Consigned units that sold but were never rung up at the till. Stock goes down
 * by a SALE movement and the units join the consignor's ledger at the product's
 * current consignor price, so what is owed is complete. No Sale is created, so
 * takings and profit reports are untouched.
 */
export class RecordCatchUpSaleUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(input: { productId: string; quantity: string; soldAt?: Date; note?: string; actorId: string }) {
    const quantity = cleanCatchUpQuantity(input.quantity);
    return this.txManager.run(async (tx) => {
      const repo = new PrismaConsignmentRepository(tx);
      const product = await repo.findConsignmentProduct(input.productId);
      if (!product) throw new ConsignmentNotFoundError("Barang titipan tidak ditemukan.");

      const entry = await repo.createCatchUp({
        productId: product.id,
        supplierId: product.consignorId as string,
        quantity,
        unitCost: product.purchasePrice.toString(),
        soldAt: input.soldAt ?? new Date(),
        note: input.note?.trim() || null,
        createdById: input.actorId,
      });
      await moveStock(
        tx,
        { productId: product.id, productName: product.name },
        `-${quantity}`,
        CONSIGNMENT_CATCHUP_REFERENCE,
        entry.id,
        input.actorId,
        `Penjualan titipan susulan: ${quantity}${input.note?.trim() ? ` (${input.note.trim()})` : ""}`,
        "SALE"
      );
      await new AuditLogger(tx).record({
        actorId: input.actorId,
        action: "CONSIGNMENT_CATCHUP_SALE",
        entityType: "ConsignmentSale",
        entityId: entry.id,
        afterValue: { product: product.name, quantity, unitCost: product.purchasePrice.toString() },
      });
      return { id: entry.id, productName: product.name, owed: new Decimal(quantity).mul(product.purchasePrice.toString()).toFixed(2) };
    });
  }
}

/** Pay a consignor for the units that sold. Never more than is owed; not an expense. */
export class PayConsignorUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(input: { supplierId: string; amount: string; note?: string; paidAt?: Date; actorId: string }) {
    return this.txManager.run(async (tx) => {
      const repo = new PrismaConsignmentRepository(tx);
      const position = buildConsignorPositions(await repo.positionData()).find((p) => p.consignorId === input.supplierId);
      if (!position) throw new ConsignmentNotFoundError("Penitip tidak ditemukan.");
      const amount = cleanPayment(input.amount, position.balance);

      const payment = await repo.createPayment({
        supplierId: input.supplierId,
        amount,
        paidAt: input.paidAt ?? new Date(),
        note: input.note?.trim() || null,
        createdById: input.actorId,
      });
      await new AuditLogger(tx).record({
        actorId: input.actorId,
        action: "CONSIGNMENT_PAID",
        entityType: "ConsignmentPayment",
        entityId: payment.id,
        afterValue: { consignor: position.name, amount, balanceBefore: position.balance },
      });
      return payment;
    });
  }
}
