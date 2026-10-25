import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { FindDuplicateProductsUseCase } from "@/modules/products/application/find-duplicate-products-use-case";

/** Products that look entered twice (same name or SKU). Read-only. */
export async function GET() {
  try {
    await requireSession("products.manage");
    return NextResponse.json(await new FindDuplicateProductsUseCase().execute());
  } catch (error) {
    return toErrorResponse(error);
  }
}
