import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/shared/security/auth";
import { DEVICE_COOKIE, deviceCookieOptions } from "@/shared/security/device-session";

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

  const kind = parsed.data.permanent ? "permanent" : "temporary";
  const res = NextResponse.json({ ok: true, kind });
  res.cookies.set(DEVICE_COOKIE, kind, deviceCookieOptions(kind, secure()));
  return res;
}

/** Forget the answer; called on logout so nothing outlives the session. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEVICE_COOKIE, "", { ...deviceCookieOptions("temporary", secure()), maxAge: 0 });
  return res;
}
