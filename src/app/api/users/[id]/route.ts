import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { UpdateUserUseCase } from "@/modules/users/application/update-user-use-case";

const schema = z.object({
  name: z.string().optional(),
  role: z.enum(["OWNER", "ADMIN", "KASIR", "STAFF_STOK"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession("users.manage");
    const { id } = await params;
    const body = schema.parse(await req.json());
    const useCase = new UpdateUserUseCase();
    const user = await useCase.execute({ userId: id, ...body, actorId: session.user.id });
    return NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role, active: user.active },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
