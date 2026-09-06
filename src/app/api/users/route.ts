import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { CreateUserUseCase } from "@/modules/users/application/create-user-use-case";
import { prisma } from "@/shared/infrastructure/prisma";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "KASIR", "STAFF_STOK"]),
});

export async function GET() {
  try {
    await requireSession("users.manage");
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("users.manage");
    const body = schema.parse(await req.json());
    const useCase = new CreateUserUseCase();
    const user = await useCase.execute({ ...body, actorId: session.user.id });
    return NextResponse.json(
      { user: { id: user.id, username: user.username, name: user.name, role: user.role } },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
