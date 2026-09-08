import { PrismaScanSessionRepository } from "../infrastructure/prisma-scan-session-repository";
import { ScanSessionDomainService } from "../domain/scan-session-domain-service";
import { prisma } from "@/shared/infrastructure/prisma";

/** Desktop side of pairing: mint a short, easy-to-read code the phone can
 * be pointed at (via QR or manual entry) to start relaying barcode scans
 * into this page's cart/audit/search — PRD 71 camera scanner, extended to
 * a second device acting as a pure scanner. */
export class CreateScanSessionUseCase {
  async execute(createdById: string, label?: string) {
    const repo = new PrismaScanSessionRepository(prisma);
    const domain = new ScanSessionDomainService();

    // Collisions are astronomically unlikely (33^6 codes) but a unique
    // constraint backs this up regardless — retry once if it ever happens.
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = domain.generateCode();
      const existing = await repo.findByCode(code);
      if (existing) continue;
      return repo.create({ code, createdById, label, expiresAt: domain.computeExpiry() });
    }
    throw new Error("Gagal membuat kode sesi, coba lagi.");
  }
}
