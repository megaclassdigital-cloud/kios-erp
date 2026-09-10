import { PrismaScanSessionRepository } from "../infrastructure/prisma-scan-session-repository";
import { ScanSessionDomainService, ScanSessionExpiredError, ScanSessionNotFoundError } from "../domain/scan-session-domain-service";
import { prisma } from "@/shared/infrastructure/prisma";

/** The connected phone calls this every few seconds regardless of whether
 * it's actively scanning anything — the only way the desktop side can
 * tell "still there, just nothing to scan right now" apart from "the
 * connection silently dropped" (PRD: both sides must notice a broken
 * pairing, not just assume connected forever). Rejecting here (session
 * gone/expired/disconnected) is exactly what tells the phone to show
 * "Sesi diputuskan" instead of quietly doing nothing. */
export class HeartbeatScanSessionUseCase {
  async execute(code: string) {
    const repo = new PrismaScanSessionRepository(prisma);
    const domain = new ScanSessionDomainService();

    const session = await repo.findByCode(code);
    if (!session) {
      throw new ScanSessionNotFoundError("Kode sesi tidak ditemukan.");
    }
    if (domain.isExpired(session)) {
      throw new ScanSessionExpiredError("Sesi sudah berakhir.");
    }

    await repo.touchLastSeen(session.id);
  }
}
