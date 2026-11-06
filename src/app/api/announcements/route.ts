import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { hasPermission } from "@/shared/security/permissions";
import { pendingAnnouncements } from "@/modules/announcements/announcements";

/** Announcements that apply to this role. The device remembers which it has shown. */
export async function GET() {
  try {
    const session = await requireSession();
    // Which ones this *device* has already shown is decided on the device, so a
    // second tablet still shows what the first one did. The list is only filtered by role.
    const pending = pendingAnnouncements({ has: (p) => hasPermission(session.user.role, p), done: new Set() });
    return NextResponse.json({ announcements: pending }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
