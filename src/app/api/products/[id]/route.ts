import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { UpdateProductUseCase } from "@/modules/products/application/update-product-use-case";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  purchasePrice: z.string().optional(),
  sellingPrice: z.string().optional(),
  minimumStock: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  serviceProvider: z.string().optional(),
  // Null clears the date (a product that no longer tracks one); omitted
  // leaves it untouched, so a partial edit cannot wipe it by accident.
  expiryDate: z.string().nullable().optional(),
  expiryWarnDays: z.number().int().min(0).max(3650).optional(),
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

/** PRD 37, 45: price/name/expiry edits never touch the barcode or the
 * immutable product id — every historical sale keeps its own snapshot. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("products.manage");
    const { id } = await params;
    const body = schema.parse(await req.json());

    const product = await new UpdateProductUseCase().execute(
      id,
      {
        ...body,
        expiryDate:
          body.expiryDate === undefined
            ? undefined
            : body.expiryDate === null
              ? null
              : new Date(body.expiryDate),
      },
      session.user.id
    );

    return NextResponse.json({ product });
  } catch (error) {
    return toErrorResponse(error);
  }
}
