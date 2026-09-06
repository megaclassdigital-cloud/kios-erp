import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaBarcodeRepository } from "../infrastructure/prisma-barcode-repository";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";

/** PRD 36, 45: retiring never deletes — the barcode row and its historical
 * resolution stay intact, only status flips to RETIRED. */
export class RetireBarcodeUseCase {
  async execute(barcodeId: string, actorId: string) {
    const barcodes = new PrismaBarcodeRepository(prisma);
    const barcode = await barcodes.retire(barcodeId);
    const audit = new AuditLogger(prisma);
    await audit.record({
      actorId,
      action: "BARCODE_RETIRED",
      entityType: "ProductBarcode",
      entityId: barcodeId,
      afterValue: { barcodeValue: barcode.barcodeValue },
    });
    return barcode;
  }
}
