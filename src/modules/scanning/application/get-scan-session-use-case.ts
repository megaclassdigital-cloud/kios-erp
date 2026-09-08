import { PrismaScanSessionRepository } from "../infrastructure/prisma-scan-session-repository";
import { ScanSessionDomainService, ScanSessionExpiredError, ScanSessionNotFoundError } from "../domain/scan-session-domain-service";
import { prisma } from "@/shared/infrastructure/prisma";

/** Used both by the phone (to show "connected to X's session" and reject
 * a stale/expired code before it starts the camera) and by the desktop's
 * own polling loop to confirm the session it created is still live. */
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
    return session;
  }
}
