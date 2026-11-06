import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/shared/infrastructure/prisma";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { ANNOUNCEMENTS } from "@/modules/announcements/announcements";

/** Marks an announcement completed for this user. Idempotent; unknown keys are refused. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { key } = z.object({ key: z.string() }).parse(await req.json());
    if (!ANNOUNCEMENTS.some((a) => a.key === key)) throw new Error("Pengumuman tidak dikenal.");
    await prisma.announcementAck.upsert({
      where: { userId_key: { userId: session.user.id, key } },
      create: { userId: session.user.id, key },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
