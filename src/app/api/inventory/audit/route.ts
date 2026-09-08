import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { prisma } from "@/shared/infrastructure/prisma";
import { BarcodeValue } from "@/shared/barcode/barcode-value";

const schema = z.object({ barcode: z.string().min(1) });

/** PRD 24-25, 36: barcode-driven audit trail. Deliberately does NOT reject
 * a RETIRED barcode or an inactive product the way POS resolution does —
 * an audit must still be able to trace a barcode that's no longer sellable
 * back to its full stock movement history. */
export async function GET(req: NextRequest) {
  try {
    await requireSession("inventory.view");
    const { searchParams } = new URL(req.url);
    const { barcode } = schema.parse({ barcode: searchParams.get("barcode") });
    const normalized = BarcodeValue.normalize(barcode).toString();

    const productBarcode = await prisma.productBarcode.findUnique({
      where: { barcodeValue: normalized },
    });
    if (!productBarcode) {
      return NextResponse.json({ error: "Barcode tidak terdaftar." }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productBarcode.productId },
      include: { barcodes: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    const movements = await prisma.stockMovement.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { name: true } } },
    });

    return NextResponse.json({ product, scannedBarcode: productBarcode, movements });
  } catch (error) {
    return toErrorResponse(error);
  }
}
