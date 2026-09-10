import type { ScanEvent, ScanSession } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CreateScanSessionInput, ScanSessionRepository } from "../repository/scan-session-repository";

export class PrismaScanSessionRepository implements ScanSessionRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateScanSessionInput): Promise<ScanSession> {
    return this.db.scanSession.create({ data: input });
  }

  async findByCode(code: string): Promise<ScanSession | null> {
    return this.db.scanSession.findUnique({ where: { code } });
  }

  async disconnect(id: string): Promise<void> {
    await this.db.scanSession.update({ where: { id }, data: { disconnectedAt: new Date() } });
  }

  async claim(id: string): Promise<ScanSession> {
    const now = new Date();
    return this.db.scanSession.update({ where: { id }, data: { claimedAt: now, lastSeenAt: now } });
  }

  async touchLastSeen(id: string): Promise<void> {
    await this.db.scanSession.update({ where: { id }, data: { lastSeenAt: new Date() } });
  }

  async addEvent(sessionId: string, barcodeValue: string): Promise<ScanEvent> {
    // A scan is itself proof the phone is alive — touch lastSeenAt in the
    // same write instead of relying only on the separate heartbeat call.
    await this.db.scanSession.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
    return this.db.scanEvent.create({ data: { sessionId, barcodeValue } });
  }

  async listEventsSince(sessionId: string, after: Date | null): Promise<ScanEvent[]> {
    return this.db.scanEvent.findMany({
      where: { sessionId, createdAt: after ? { gt: after } : undefined },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
  }
}
