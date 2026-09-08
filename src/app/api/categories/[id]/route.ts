import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PrismaCategoryRepository } from "@/modules/products/infrastructure/prisma-category-repository";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({ name: z.string().min(1) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("products.manage");
    const { id } = await params;
    const { name } = schema.parse(await req.json());
    const repo = new PrismaCategoryRepository(prisma);
    const category = await repo.update(id, name);
    const audit = new AuditLogger(prisma);
    await audit.record({
      actorId: session.user.id,
      action: "CATEGORY_RENAMED",
      entityType: "Category",
      entityId: id,
      afterValue: { name },
    });
    return NextResponse.json({ category });
  } catch (error) {
    return toErrorResponse(error);
  }
}
