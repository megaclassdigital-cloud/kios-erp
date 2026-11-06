import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/prisma";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { hasPermission } from "@/shared/security/permissions";
import { pendingAnnouncements } from "@/modules/announcements/announcements";

/** Announcements this user has not completed yet. */
export async function GET() {
  try {
    const session = await requireSession();
    const acks = await prisma.announcementAck.findMany({ where: { userId: session.user.id }, select: { key: true } });
    const pending = pendingAnnouncements({
      has: (p) => hasPermission(session.user.role, p),
      done: new Set(acks.map((a) => a.key)),
    });
    return NextResponse.json({ announcements: pending }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
