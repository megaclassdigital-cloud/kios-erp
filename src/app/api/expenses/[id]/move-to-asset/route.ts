import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { assertPermission } from "@/shared/security/permissions";
import { MoveExpenseToAssetUseCase } from "@/modules/finance/application/expense-use-cases";

const schema = z.object({ name: z.string(), category: z.string(), quantity: z.union([z.string(), z.number()]) });

/** Turn an expense that was really a purchase of equipment into an asset. Needs both finances and assets. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("finance.manage");
    assertPermission(session.user.role, "assets.manage");
    const { id } = await params;
    const asset = await new MoveExpenseToAssetUseCase().execute(id, schema.parse(await req.json()), session.user.id);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
