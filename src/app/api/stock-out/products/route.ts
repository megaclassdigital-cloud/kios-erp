import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { prisma } from "@/shared/infrastructure/prisma";

/** Product picker for Pengeluaran Barang: name, SKU or an exact barcode. */
export async function GET(req: NextRequest) {
  try {
    await requireSession("stockout.manage");
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const products = await new PrismaProductRepository(prisma).searchPhysical(q);
    return NextResponse.json({
      products: products.map((p) => ({ ...p, currentStock: p.currentStock.toString() })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
