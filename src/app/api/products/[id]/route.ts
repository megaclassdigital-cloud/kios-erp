import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({
  name: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  purchasePrice: z.string().optional(),
  sellingPrice: z.string().optional(),
  minimumStock: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  serviceProvider: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession("products.manage");
    const { id } = await params;
    const repo = new PrismaProductRepository(prisma);
    const product = await repo.findById(id);
    return NextResponse.json({ product });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** PRD 37, 45: price/name/category edits never touch the barcode or the
 * immutable product id — every historical sale keeps its own snapshot. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("products.manage");
    const { id } = await params;
    const body = schema.parse(await req.json());
    const repo = new PrismaProductRepository(prisma);
    const before = await repo.findById(id);
    const product = await repo.update(id, body);
    const audit = new AuditLogger(prisma);
    await audit.record({
      actorId: session.user.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: id,
      beforeValue: before ? { sellingPrice: before.sellingPrice, name: before.name } : undefined,
      afterValue: { sellingPrice: product.sellingPrice, name: product.name },
    });
    return NextResponse.json({ product });
  } catch (error) {
    return toErrorResponse(error);
  }
}
