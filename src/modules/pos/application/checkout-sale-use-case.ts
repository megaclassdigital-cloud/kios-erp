import Decimal from "decimal.js";
import type { PaymentMethod } from "@prisma/client";
import { TransactionManager, type Db } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { DailyCounterRepository } from "@/shared/infrastructure/daily-counter-repository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import type { ProductWithBarcodes } from "@/modules/products/repository/product-repository";
import { PrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { PrismaSaleRepository } from "../infrastructure/prisma-sale-repository";
import { PrismaPaymentRepository } from "../infrastructure/prisma-payment-repository";
import { PrismaShiftRepository } from "../infrastructure/prisma-shift-repository";
import {
  CheckoutDomainService,
  EmptyCartError,
  InsufficientStockError,
  ShiftNotOpenError,
} from "../domain/checkout-domain-service";

export interface ServiceDetailRequest {
  phoneNumber?: string;
  meterNumber?: string;
  customerNumber?: string;
}

export interface CheckoutItemRequest {
  productId: string;
  quantity: string;
  serviceDetail?: ServiceDetailRequest;
}

export interface CheckoutSaleRequest {
  cashierId: string;
  shiftId: string;
  items: CheckoutItemRequest[];
  paymentMethod: PaymentMethod;
  cashReceived?: string;
  discount?: string;
  idempotencyKey: string;
}

/**
 * Atomic checkout (PRD 16-19): one DB transaction creates the Sale, items,
 * payment and (for cash, which settles immediately) stock movements. Stock
 * is only ever decremented once payment status becomes PAID — see
 * `applyPaidStockEffects`, shared with ConfirmCashlessPaymentUseCase so the
 * two payment paths cannot diverge.
 */
export class CheckoutSaleUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(req: CheckoutSaleRequest) {
    if (req.items.length === 0) {
      throw new EmptyCartError("Keranjang kosong.");
    }

    return this.txManager.run(async (tx) => {
      const payments = new PrismaPaymentRepository(tx);

      const existingPayment = await payments.findByIdempotencyKey(req.idempotencyKey);
      if (existingPayment) {
        const sales = new PrismaSaleRepository(tx);
        return sales.findById(existingPayment.saleId);
      }

      const shifts = new PrismaShiftRepository(tx);
      const shift = await shifts.findById(req.shiftId);
      if (!shift || shift.status !== "OPEN" || shift.cashierId !== req.cashierId) {
        throw new ShiftNotOpenError("Shift kasir belum dibuka.");
      }

      const products = new PrismaProductRepository(tx);
      const domain = new CheckoutDomainService();

      const resolvedItems = await Promise.all(
        req.items.map(async (item) => {
          const product = await products.findById(item.productId);
          if (!product || !product.active) {
            throw new Error(`Produk tidak ditemukan atau tidak aktif.`);
          }

          const serviceDetail =
            product.productType === "SERVICE"
              ? buildServiceDetail(product, item.serviceDetail)
              : undefined;

          return {
            productId: product.id,
            productName: product.name,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(product.sellingPrice.toString()),
            costPrice: new Decimal(product.purchasePrice.toString()),
            trackInventory: product.trackInventory,
            serviceDetail,
          };
        })
      );

      const totals = domain.computeTotals(
        resolvedItems,
        req.discount ? new Decimal(req.discount) : undefined
      );

      let cashReceived: Decimal | undefined;
      let change: Decimal | undefined;
      if (req.paymentMethod === "CASH") {
        cashReceived = new Decimal(req.cashReceived ?? "0");
        change = domain.computeChange(cashReceived, totals.grandTotal).toDecimal();
      }

      const counters = new DailyCounterRepository(tx);
      const transactionNumber = await counters.next("TRX");

      const sales = new PrismaSaleRepository(tx);
      const status = req.paymentMethod === "CASH" ? "PAID" : "PENDING";

      const sale = await sales.create({
        transactionNumber,
        cashierId: req.cashierId,
        shiftId: req.shiftId,
        paymentMethod: req.paymentMethod,
        subtotal: totals.subtotal.toString(),
        discount: totals.discount.toString(),
        grandTotal: totals.grandTotal.toString(),
        cashReceived: cashReceived?.toFixed(2),
        changeAmount: change?.toFixed(2),
        status,
        items: resolvedItems.map((line) => ({
          productId: line.productId,
          productNameSnapshot: line.productName,
          quantity: line.quantity.toString(),
          unitPriceAtSale: line.unitPrice.toFixed(2),
          costPriceAtSale: line.costPrice.toFixed(2),
          subtotal: line.unitPrice.times(line.quantity).toFixed(2),
          serviceDetail: line.serviceDetail,
        })),
      });

      await payments.create({
        saleId: sale.id,
        method: req.paymentMethod,
        status: status === "PAID" ? "PAID" : "PENDING",
        amount: totals.grandTotal.toString(),
        idempotencyKey: req.idempotencyKey,
      });

      if (status === "PAID") {
        await applyPaidStockEffects(tx, sale.id, req.cashierId, resolvedItems);
      }

      const audit = new AuditLogger(tx);
      await audit.record({
        actorId: req.cashierId,
        action: "SALE_CHECKOUT",
        entityType: "Sale",
        entityId: sale.id,
        afterValue: { transactionNumber, status, grandTotal: totals.grandTotal.toString() },
      });

      return sales.findById(sale.id);
    });
  }
}

/** PRD 46: pulsa needs a phone number, token listrik needs a meter + customer
 * number. Provider/nominal are snapshotted from the product, not user input,
 * so the recorded amount always matches what was actually charged. */
function buildServiceDetail(product: ProductWithBarcodes, input?: ServiceDetailRequest) {
  if (!product.serviceType) {
    throw new Error("Produk layanan belum memiliki jenis layanan (Pulsa/Token Listrik).");
  }
  if (product.serviceType === "PULSA") {
    if (!input?.phoneNumber?.trim()) {
      throw new Error("Nomor HP wajib diisi untuk transaksi pulsa.");
    }
  } else {
    if (!input?.meterNumber?.trim()) {
      throw new Error("Nomor meter wajib diisi untuk transaksi token listrik.");
    }
    if (!input?.customerNumber?.trim()) {
      throw new Error("Nomor pelanggan wajib diisi untuk transaksi token listrik.");
    }
  }
  return {
    serviceType: product.serviceType,
    provider: product.serviceProvider,
    phoneNumber: input?.phoneNumber?.trim(),
    meterNumber: input?.meterNumber?.trim(),
    customerNumber: input?.customerNumber?.trim(),
    nominal: product.sellingPrice.toString(),
  };
}

export async function applyPaidStockEffects(
  tx: Db,
  saleId: string,
  actorId: string,
  items: { productId: string; quantity: Decimal; trackInventory?: boolean }[]
) {
  const products = new PrismaProductRepository(tx);
  const inventory = new PrismaInventoryRepository(tx);

  for (const item of items) {
    const trackInventory =
      item.trackInventory ?? (await products.findById(item.productId))?.trackInventory;
    if (!trackInventory) continue;
    const ok = await products.decrementStockIfAvailable(item.productId, item.quantity.toString());
    if (!ok) {
      throw new InsufficientStockError(`Stok tidak mencukupi untuk produk ini.`);
    }
    await inventory.recordMovement({
      productId: item.productId,
      quantity: item.quantity.negated().toString(),
      movementType: "SALE",
      referenceType: "SALE",
      referenceId: saleId,
      actorId,
    });
  }
}
