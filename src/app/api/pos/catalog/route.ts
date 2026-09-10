import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetPosCatalogUseCase } from "@/modules/products/application/get-pos-catalog-use-case";

/** Bulk catalog for the client-side barcode index — loaded once per POS
 * session (not per scan) so a known product resolves from an in-memory
 * Map instead of a network round trip. Read-only, never authoritative
 * for checkout. */
export async function GET() {
  try {
    await requireSession("pos.operate");
    const useCase = new GetPosCatalogUseCase();
    const items = await useCase.execute();
    return NextResponse.json({ items });
  } catch (error) {
    return toErrorResponse(error);
  }
}
