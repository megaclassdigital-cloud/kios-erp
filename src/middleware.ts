import { NextResponse } from "next/server";
import { auth } from "@/shared/security/auth";
import { DEVICE_COOKIE, parseDeviceKind } from "@/shared/security/device-session";

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  // Signed in is not enough: the device question must also have been answered
  // on this browser. A temporary device's answer disappears when the browser
  // closes, which is what signs it out; an unanswered one never gets in.
  const deviceConfirmed = parseDeviceKind(req.cookies.get(DEVICE_COOKIE)?.value) !== null;

  if ((!req.auth || !deviceConfirmed) && !isPublic && !isAuthApi) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
