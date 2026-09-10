/**
 * Regenerates every currently ACTIVE, INTERNAL-source barcode (not just
 * ones still on the old KERP scheme) — a clean, guaranteed-fresh reissue
 * for every internally-generated product barcode so every physical label
 * can be reprinted from a known-good state. MANUFACTURER-source barcodes
 * (real packaging codes like EAN13) are never touched — those identify
 * the actual physical product, not something this app minted.
 *
 * Run once: npx tsx scripts/regenerate-all-internal-barcodes.ts
 */
import { prisma } from "../src/shared/infrastructure/prisma";
import { RegenerateInternalBarcodesUseCase } from "../src/modules/products/application/regenerate-internal-barcodes-use-case";

async function main() {
  const owner = await prisma.user.findFirst({ where: { role: "OWNER" }, orderBy: { createdAt: "asc" } });
  if (!owner) throw new Error("No OWNER user found to attribute this migration to.");

  const active = await prisma.productBarcode.findMany({
    where: { status: "ACTIVE", source: "INTERNAL" },
    select: { id: true, barcodeValue: true, productId: true },
  });

  console.log(`Found ${active.length} active internal barcode(s) to regenerate.`);

  const useCase = new RegenerateInternalBarcodesUseCase();
  let done = 0;
  for (const row of active) {
    const result = await useCase.regenerateOne(row.id, owner.id);
    done += 1;
    console.log(`[${done}/${active.length}] ${row.barcodeValue} -> ${result.barcodeValue} (product ${row.productId})`);
  }

  console.log(`Done. ${done} barcode(s) regenerated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
