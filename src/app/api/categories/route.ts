import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PrismaCategoryRepository } from "@/modules/products/infrastructure/prisma-category-repository";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({ name: z.string().min(1) });

export async function GET() {
  try {
    await requireSession();
    const repo = new PrismaCategoryRepository(prisma);
    return NextResponse.json({ categories: await repo.list() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession("products.manage");
    const { name } = schema.parse(await req.json());
    const repo = new PrismaCategoryRepository(prisma);
    const category = await repo.create(name);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
