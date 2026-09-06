import type { Payment, PaymentMethod, PaymentStatus } from "@prisma/client";

export interface CreatePaymentInput {
  saleId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  idempotencyKey: string;
  providerRef?: string;
}

export interface PaymentRepository {
  create(input: CreatePaymentInput): Promise<Payment>;
  findByIdempotencyKey(key: string): Promise<Payment | null>;
  markPaid(id: string): Promise<Payment>;
}
