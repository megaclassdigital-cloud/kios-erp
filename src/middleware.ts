import { NextResponse } from "next/server";
import { auth } from "@/shared/security/auth";

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (!req.auth && !isPublic && !isAuthApi) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
