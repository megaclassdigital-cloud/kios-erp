import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "./auth";
import { assertPermission, ForbiddenError, type Permission } from "./permissions";

export class UnauthorizedError extends Error {}

/** Every mutating/reading API route must call this — the PRD is explicit
 * that hiding a button client-side is not authorization (PRD 5). */
export async function requireSession(permission?: Permission) {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError("Anda harus login.");
  }
  if (permission) {
    assertPermission(session.user.role, permission);
  }
  return session;
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  // A ZodError is an Error, so without this its `message` — a JSON dump of
  // every issue — went straight into the response and onto the screen. Every
  // route parses its body with zod, so this was one malformed field away on
  // any of them: a cashier scanning an over-long code would have been shown
  // a wall of JSON instead of being told what to fix.
  if (error instanceof ZodError) {
    const fields = [...new Set(error.issues.map((issue) => issue.path.join(".") || "data"))];
    return NextResponse.json(
      { error: `Data tidak valid pada: ${fields.join(", ")}. Periksa kembali isian Anda.` },
      { status: 400 }
    );
  }
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return NextResponse.json({ error: message }, { status: 400 });
}
