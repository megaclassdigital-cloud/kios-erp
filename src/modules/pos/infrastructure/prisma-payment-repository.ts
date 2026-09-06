import type { Payment } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CreatePaymentInput, PaymentRepository } from "../repository/payment-repository";

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreatePaymentInput): Promise<Payment> {
    return this.db.payment.create({
      data: {
        ...input,
        paidAt: input.status === "PAID" ? new Date() : undefined,
      },
    });
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.db.payment.findUnique({ where: { idempotencyKey: key } });
  }

  async markPaid(id: string): Promise<Payment> {
    return this.db.payment.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }
}
