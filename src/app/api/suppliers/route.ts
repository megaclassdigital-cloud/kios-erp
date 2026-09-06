import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PrismaSupplierRepository } from "@/modules/suppliers/infrastructure/prisma-supplier-repository";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    await requireSession();
    const repo = new PrismaSupplierRepository(prisma);
    return NextResponse.json({ suppliers: await repo.list() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession("suppliers.manage");
    const body = schema.parse(await req.json());
    const repo = new PrismaSupplierRepository(prisma);
    const supplier = await repo.create(body);
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
