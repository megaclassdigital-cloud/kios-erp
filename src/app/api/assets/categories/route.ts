import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { CreateAssetCategoryUseCase } from "@/modules/assets/application/asset-category-use-cases";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("assets.manage");
    const { name } = z.object({ name: z.string() }).parse(await req.json());
    return NextResponse.json({ category: await new CreateAssetCategoryUseCase().execute(name, session.user.id) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
