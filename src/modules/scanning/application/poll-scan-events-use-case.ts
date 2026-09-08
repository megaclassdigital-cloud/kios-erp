import { PrismaScanSessionRepository } from "../infrastructure/prisma-scan-session-repository";
import { ScanSessionNotFoundError } from "../domain/scan-session-domain-service";
import { prisma } from "@/shared/infrastructure/prisma";

/** Desktop side: polled every ~1s while a pairing is active. Ownership is
 * checked so only the user who created the session can read its scans. */
export class PollScanEventsUseCase {
  async execute(code: string, requesterId: string, after: Date | null) {
    const repo = new PrismaScanSessionRepository(prisma);

    const session = await repo.findByCode(code);
    if (!session || session.createdById !== requesterId) {
      throw new ScanSessionNotFoundError("Kode sesi tidak ditemukan.");
    }

    const events = await repo.listEventsSince(session.id, after);
    return { session, events };
  }
}
