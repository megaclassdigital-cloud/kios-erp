import { NextResponse } from "next/server";
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
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return NextResponse.json({ error: message }, { status: 400 });
}
