import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import type { Permission } from "@/shared/security/permissions";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { searchProducts } from "@/modules/products/domain/product-search";
import { prisma } from "@/shared/infrastructure/prisma";

/** Each screen that picks a product asks with its own permission, so a role
 * can only search where it could already work. */
const SCOPE_PERMISSION: Record<string, Permission> = {
  receiving: "receiving.manage",
  stockout: "stockout.manage",
  opname: "stockopname.manage",
  audit: "inventory.view",
  consignment: "consignment.manage",
};

/** Product picker: name, SKU or barcode digits. Read-only. */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const permission = SCOPE_PERMISSION[searchParams.get("scope") ?? ""];
    if (!permission) throw new Error("Lingkup pencarian tidak dikenal.");
    await requireSession(permission);

    // Consigned goods enter only through Barang Titipan, so no other screen offers them,
    // and Barang Titipan offers nothing else (optionally only one consignor's).
    const scope = searchParams.get("scope");
    const all = await new PrismaProductRepository(prisma).listForSearch(
      scope === "consignment"
        ? { consignment: "only", consignorId: searchParams.get("consignorId") ?? undefined }
        : scope === "receiving"
          ? { consignment: "exclude" }
          : {}
    );
    const found = searchProducts(all, searchParams.get("q") ?? "", 10);
    return NextResponse.json({
      products: found
        // A product always has a barcode when it is physical; one without is
        // skipped rather than offered and then failing to resolve.
        .filter((p) => p.barcodes.length > 0)
        .map(({ barcodes, ...p }) => ({ ...p, barcode: barcodes[0] })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
