/**
 * One-off migration: reissues every ACTIVE, INTERNAL-source barcode still
 * on the old KERP-prefixed scheme under the new short numeric scheme
 * (src/shared/barcode/barcode-value.ts). Idempotent — only touches
 * barcodes whose value still starts with "KERP", so it's safe to re-run
 * if interrupted partway through.
 *
 * Run once: npx tsx scripts/regenerate-barcodes.ts
 */
import { prisma } from "../src/shared/infrastructure/prisma";
import { RegenerateInternalBarcodesUseCase } from "../src/modules/products/application/regenerate-internal-barcodes-use-case";

async function main() {
  const owner = await prisma.user.findFirst({ where: { role: "OWNER" }, orderBy: { createdAt: "asc" } });
  if (!owner) throw new Error("No OWNER user found to attribute this migration to.");

  const stale = await prisma.productBarcode.findMany({
    where: { status: "ACTIVE", source: "INTERNAL", barcodeValue: { startsWith: "KERP" } },
    select: { id: true, barcodeValue: true, productId: true },
  });

  console.log(`Found ${stale.length} legacy internal barcode(s) to regenerate.`);

  const useCase = new RegenerateInternalBarcodesUseCase();
  let done = 0;
  for (const row of stale) {
    const result = await useCase.regenerateOne(row.id, owner.id);
    done += 1;
    console.log(`[${done}/${stale.length}] ${row.barcodeValue} -> ${result.barcodeValue} (product ${row.productId})`);
  }

  console.log(`Done. ${done} barcode(s) regenerated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
