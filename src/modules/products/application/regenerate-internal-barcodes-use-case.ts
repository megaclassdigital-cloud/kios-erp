import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaBarcodeRepository } from "../infrastructure/prisma-barcode-repository";
import { BarcodeDomainService } from "../domain/barcode-domain-service";

/**
 * One-off remediation for barcodes minted under the old KERP-prefixed
 * scheme: those values were too long to render at a reliably scannable
 * module width on small thermal labels. Retires each active INTERNAL
 * barcode and mints a replacement under the new short numeric scheme,
 * one product at a time (its own transaction) so a failure partway
 * through only stops the run, never leaves a half-written pair — the
 * retired-never-reused invariant (PRD 36, 82) is preserved throughout.
 */
export class RegenerateInternalBarcodesUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async regenerateOne(barcodeId: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const barcodes = new PrismaBarcodeRepository(tx);
      const domain = new BarcodeDomainService();
      const audit = new AuditLogger(tx);

      const old = await tx.productBarcode.findUniqueOrThrow({ where: { id: barcodeId } });

      const retired = await barcodes.retire(old.id);
      const sequence = await barcodes.nextInternalSequence();
      const newValue = domain.formatInternalBarcode(sequence);
      const created = await barcodes.create({
        productId: old.productId,
        barcodeValue: newValue,
        barcodeType: "CODE128",
        unit: old.unit,
        conversionFactor: old.conversionFactor.toString(),
        source: "INTERNAL",
      });

      await audit.record({
        actorId,
        action: "BARCODE_REGENERATED",
        entityType: "Product",
        entityId: old.productId,
        beforeValue: { barcodeValue: retired.barcodeValue },
        afterValue: { barcodeValue: created.barcodeValue },
      });

      return created;
    });
  }
}
