import { PrismaScanSessionRepository } from "../infrastructure/prisma-scan-session-repository";
import {
  ScanSessionAlreadyClaimedError,
  ScanSessionDomainService,
  ScanSessionExpiredError,
  ScanSessionNotFoundError,
} from "../domain/scan-session-domain-service";
import { prisma } from "@/shared/infrastructure/prisma";

/** The phone's connect step: confirms the code is real, then locks it to
 * this one connection (PRD: one physical pairing per customer session —
 * never two phones sharing a code). A claim that's gone stale (the
 * original phone silently dropped, no heartbeat) is reclaimable, so
 * scanning the same QR again after a drop just works. */
export class GetScanSessionUseCase {
  async execute(code: string) {
    const repo = new PrismaScanSessionRepository(prisma);
    const domain = new ScanSessionDomainService();

    const session = await repo.findByCode(code);
    if (!session) {
      throw new ScanSessionNotFoundError("Kode sesi tidak ditemukan.");
    }
    if (domain.isExpired(session)) {
      throw new ScanSessionExpiredError("Sesi sudah berakhir. Buat sesi baru dari layar utama.");
    }
    if (!domain.canClaim(session)) {
      throw new ScanSessionAlreadyClaimedError("Sesi ini sudah terhubung dengan perangkat lain.");
    }
    return repo.claim(session.id);
  }
}
