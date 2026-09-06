import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { prisma } from "@/shared/infrastructure/prisma";

/** Sensitive-action audit trail (PRD 74) — owner-only monitoring view. */
export async function GET() {
  try {
    await requireSession("audit.view");
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { name: true, username: true, role: true } } },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return toErrorResponse(error);
  }
}
