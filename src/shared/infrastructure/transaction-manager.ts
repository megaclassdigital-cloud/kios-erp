import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Wraps Prisma's interactive transaction so Application use cases stay
 * framework-agnostic about *how* atomicity is achieved (PRD 18, 62-64).
 * Every multi-write business event (checkout, receiving, stock opname
 * approval) must run its repository calls through the same `tx` handle.
 */
export class TransactionManager {
  async run<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    return prisma.$transaction((tx) => work(tx));
  }
}
