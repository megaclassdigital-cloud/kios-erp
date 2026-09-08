import { PrismaScanSessionRepository } from "../infrastructure/prisma-scan-session-repository";
import { ScanSessionDomainService, ScanSessionExpiredError, ScanSessionNotFoundError } from "../domain/scan-session-domain-service";
import { BarcodeValue } from "@/shared/barcode/barcode-value";
import { prisma } from "@/shared/infrastructure/prisma";

/** The phone's scan-only page calls this on every decoded barcode — pure
 * relay, no product/stock lookup here at all. Whatever page paired the
 * session resolves the barcode itself via the same logic it already uses
 * for USB/local-camera input, so this module never needs to know what a
 * given scan is "for." */
export class SubmitScanEventUseCase {
  async execute(code: string, rawBarcode: string) {
    const repo = new PrismaScanSessionRepository(prisma);
    const domain = new ScanSessionDomainService();

    const session = await repo.findByCode(code);
    if (!session) {
      throw new ScanSessionNotFoundError("Kode sesi tidak ditemukan.");
    }
    if (domain.isExpired(session)) {
      throw new ScanSessionExpiredError("Sesi sudah berakhir.");
    }

    const normalized = BarcodeValue.normalize(rawBarcode).toString();
    return repo.addEvent(session.id, normalized);
  }
}
