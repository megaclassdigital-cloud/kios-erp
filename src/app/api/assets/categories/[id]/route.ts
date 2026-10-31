import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { DeleteAssetCategoryUseCase, RenameAssetCategoryUseCase } from "@/modules/assets/application/asset-category-use-cases";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("assets.manage");
    const { id } = await params;
    const { name } = z.object({ name: z.string() }).parse(await req.json());
    await new RenameAssetCategoryUseCase().execute(id, name, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("assets.manage");
    const { id } = await params;
    await new DeleteAssetCategoryUseCase().execute(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
