import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaBarcodeRepository } from "../infrastructure/prisma-barcode-repository";
import { BarcodeDomainService } from "../domain/barcode-domain-service";
import { BarcodeValue, isValidEan13 } from "@/shared/barcode/barcode-value";

export type AddBarcodeRequest =
  | { mode: "SCAN_EXISTING"; value: string; unit: string; conversionFactor?: string }
  | { mode: "GENERATE_INTERNAL"; unit: string };

/** PRD 45: admin adds an extra barcode (e.g. a carton barcode) to an
 * already-existing product without touching its identity or price. */
export class AddBarcodeToProductUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(productId: string, req: AddBarcodeRequest, actorId: string) {
    const domain = new BarcodeDomainService();

    return this.txManager.run(async (tx) => {
      const barcodes = new PrismaBarcodeRepository(tx);
      const audit = new AuditLogger(tx);

      const activeForUnit = await barcodes.findActiveByProductAndUnit(productId, req.unit);
      domain.assertNoActiveBarcodeForUnit(activeForUnit);

      let value: string;
      let source: "MANUFACTURER" | "INTERNAL";
      let conversionFactor = "1";

      if (req.mode === "SCAN_EXISTING") {
        value = BarcodeValue.normalize(req.value).toString();
        const existing = await barcodes.findByValue(value);
        if (existing) {
          domain.assertNotRetired(existing.status);
          domain.assertCanAttach(existing.productId, productId);
        }
        source = "MANUFACTURER";
        conversionFactor = req.conversionFactor ?? "1";
      } else {
        const sequence = await barcodes.nextInternalSequence();
        value = domain.formatInternalBarcode(sequence);
        source = "INTERNAL";
      }

      const barcode = await barcodes.create({
        productId,
        barcodeValue: value,
        barcodeType: source === "INTERNAL" ? "CODE128" : isValidEan13(value) ? "EAN13" : "CODE128",
        unit: req.unit,
        conversionFactor,
        source,
      });

      await audit.record({
        actorId,
        action: "BARCODE_ATTACHED",
        entityType: "Product",
        entityId: productId,
        afterValue: { barcodeValue: value, source },
      });

      return barcode;
    });
  }
}
