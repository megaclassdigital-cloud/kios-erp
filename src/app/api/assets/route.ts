import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { CreateAssetUseCase, ListAssetsUseCase } from "@/modules/assets/application/asset-use-cases";

const assetSchema = z.object({
  name: z.string(),
  category: z.string(),
  quantity: z.union([z.string(), z.number()]),
  purchasePrice: z.string(),
  purchaseDate: z.string(),
  condition: z.enum(["BAIK", "PERLU_PERBAIKAN", "RUSAK", "DIJUAL", "HILANG"]),
  note: z.string().optional(),
});

export async function GET() {
  try {
    await requireSession("assets.manage");
    return NextResponse.json(await new ListAssetsUseCase().execute());
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("assets.manage");
    const body = assetSchema.parse(await req.json());
    const asset = await new CreateAssetUseCase().execute(body, session.user.id);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
