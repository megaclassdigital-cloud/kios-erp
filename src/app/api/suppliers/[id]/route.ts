import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { PrismaSupplierRepository } from "@/modules/suppliers/infrastructure/prisma-supplier-repository";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

/** No hard delete (PRD 48 principle applied consistently) — deactivating a
 * supplier just sets active=false; it stays resolvable from historical
 * Purchase records. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("suppliers.manage");
    const { id } = await params;
    const body = schema.parse(await req.json());
    const repo = new PrismaSupplierRepository(prisma);
    const supplier = await repo.update(id, body);
    const audit = new AuditLogger(prisma);
    await audit.record({
      actorId: session.user.id,
      action: "SUPPLIER_UPDATED",
      entityType: "Supplier",
      entityId: id,
      afterValue: body,
    });
    return NextResponse.json({ supplier });
  } catch (error) {
    return toErrorResponse(error);
  }
}
