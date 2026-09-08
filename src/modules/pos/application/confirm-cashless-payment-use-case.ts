import Decimal from "decimal.js";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaSaleRepository } from "../infrastructure/prisma-sale-repository";
import { PrismaPaymentRepository } from "../infrastructure/prisma-payment-repository";
import { applyPaidStockEffects } from "./checkout-sale-use-case";

/**
 * Cashless callback endpoint (PRD 17, 19, 80). Providers may deliver the
 * same "PAID" event more than once — this must be a safe no-op on the
 * second delivery: no duplicate stock movement, no duplicate revenue.
 */
export class ConfirmCashlessPaymentUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(saleId: string, providerRef?: string) {
    return this.txManager.run(async (tx) => {
      const sales = new PrismaSaleRepository(tx);
      const payments = new PrismaPaymentRepository(tx);

      const sale = await sales.findById(saleId);
      if (!sale) throw new Error("Transaksi tidak ditemukan.");

      // Idempotent no-op: already settled by an earlier callback delivery.
      if (sale.status === "PAID") {
        return sale;
      }

      const items = (
        sale as unknown as {
          items: { productId: string; quantity: string }[];
        }
      ).items;

      await applyPaidStockEffects(
        tx,
        sale.id,
        sale.cashierId,
        items.map((i) => ({
          productId: i.productId,
          quantity: new Decimal(i.quantity),
        }))
      );

      const payment = (
        sale as unknown as { payments: { id: string; status: string }[] }
      ).payments[0];
      if (payment && payment.status !== "PAID") {
        await payments.markPaid(payment.id);
      }

      await sales.markPaid(sale.id);

      const audit = new AuditLogger(tx);
      await audit.record({
        actorId: sale.cashierId,
        action: "CASHLESS_PAYMENT_CONFIRMED",
        entityType: "Sale",
        entityId: sale.id,
        metadata: { providerRef },
      });

      return sales.findById(sale.id);
    });
  }
}
