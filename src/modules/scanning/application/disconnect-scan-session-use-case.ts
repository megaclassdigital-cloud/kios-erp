import { PrismaScanSessionRepository } from "../infrastructure/prisma-scan-session-repository";
import { ScanSessionNotFoundError } from "../domain/scan-session-domain-service";
import { prisma } from "@/shared/infrastructure/prisma";

export class DisconnectScanSessionUseCase {
  async execute(code: string, requesterId: string) {
    const repo = new PrismaScanSessionRepository(prisma);
    const session = await repo.findByCode(code);
    if (!session || session.createdById !== requesterId) {
      throw new ScanSessionNotFoundError("Kode sesi tidak ditemukan.");
    }
    await repo.disconnect(session.id);
  }
}
