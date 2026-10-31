import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { DeleteAssetUseCase, UpdateAssetUseCase } from "@/modules/assets/application/asset-use-cases";

const schema = z.object({
  name: z.string(),
  category: z.string(),
  quantity: z.union([z.string(), z.number()]),
  purchasePrice: z.string(),
  purchaseDate: z.string(),
  condition: z.enum(["BAIK", "PERLU_PERBAIKAN", "RUSAK", "DIJUAL", "HILANG"]),
  location: z.string().optional(),
  note: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("assets.manage");
    const { id } = await params;
    const asset = await new UpdateAssetUseCase().execute(id, schema.parse(await req.json()), session.user.id);
    return NextResponse.json({ asset });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("assets.manage");
    const { id } = await params;
    await new DeleteAssetUseCase().execute(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
