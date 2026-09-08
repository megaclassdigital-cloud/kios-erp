import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { CreateProductUseCase } from "@/modules/products/application/create-product-use-case";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { prisma } from "@/shared/infrastructure/prisma";

const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  productType: z.enum(["PHYSICAL", "SERVICE"]),
  serviceType: z.enum(["PULSA", "TOKEN_LISTRIK"]).optional(),
  serviceProvider: z.string().optional(),
  baseUnit: z.string().min(1),
  purchasePrice: z.string(),
  sellingPrice: z.string(),
  minimumStock: z.number().int().nonnegative(),
  trackInventory: z.boolean(),
  initialStock: z.string().optional(),
  barcode: z.union([
    z.object({ mode: z.literal("SCAN_EXISTING"), value: z.string(), unit: z.string(), conversionFactor: z.string().optional() }),
    z.object({ mode: z.literal("GENERATE_INTERNAL"), unit: z.string() }),
    z.object({ mode: z.literal("NONE") }),
  ]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("products.manage");
    const { searchParams } = new URL(req.url);
    const repo = new PrismaProductRepository(prisma);
    const products = await repo.list({
      categoryId: searchParams.get("categoryId") ?? undefined,
      active: searchParams.get("active") ? searchParams.get("active") === "true" : undefined,
      lowStock: searchParams.get("lowStock") === "true",
      search: searchParams.get("search") ?? undefined,
    });
    void session;
    return NextResponse.json({ products });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("products.manage");
    const body = createProductSchema.parse(await req.json());
    const useCase = new CreateProductUseCase();
    const product = await useCase.execute({ ...body, actorId: session.user.id });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
