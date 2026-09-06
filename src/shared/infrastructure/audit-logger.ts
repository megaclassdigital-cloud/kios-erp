import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  metadata?: unknown;
}

/** Writes sensitive-action audit trail entries (PRD 74). Always called
 * inside the same DB transaction as the mutation it documents. */
export class AuditLogger {
  constructor(private readonly db: Db) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeValue: entry.beforeValue as Prisma.InputJsonValue | undefined,
        afterValue: entry.afterValue as Prisma.InputJsonValue | undefined,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
