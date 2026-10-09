import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/shared/security/auth";
import {
  CONFIRM_WINDOW_MS,
  DEVICE_COOKIE,
  deviceCookieOptions,
  issueDeviceCookie,
} from "@/shared/security/device-session";

const schema = z.object({ permanent: z.boolean() });

const secure = () => process.env.NODE_ENV === "production";

/** Records the answer to "is this your permanent device?". Needs a signed-in
 * session; lives under /api/auth so the middleware lets it through before the
 * answer exists. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pilihan tidak valid." }, { status: 400 });

  // The question may only be answered right after a password login (or by a
  // device that already answered it). A session that has been sitting around
  // cannot use this to skip the password.
  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Konfigurasi server belum lengkap." }, { status: 500 });
  if (session.loginAt === undefined || Date.now() - session.loginAt > CONFIRM_WINDOW_MS) {
    return NextResponse.json({ error: "Sesi sudah lama. Silakan masuk ulang." }, { status: 401 });
  }

  const kind = parsed.data.permanent ? "permanent" : "temporary";
  const res = NextResponse.json({ ok: true, kind });
  res.cookies.set(DEVICE_COOKIE, await issueDeviceCookie(kind, secret, Date.now()), deviceCookieOptions(kind, secure()));
  return res;
}

/** Forget the answer; called on logout so nothing outlives the session. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEVICE_COOKIE, "", { ...deviceCookieOptions("temporary", secure()), maxAge: 0 });
  return res;
}
