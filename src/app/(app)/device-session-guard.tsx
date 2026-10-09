"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { TAB_MARKER_KEY } from "@/shared/security/device-session";

/**
 * On a device that was not marked permanent, the login must not outlive the
 * tab. sessionStorage is per tab and is wiped when the tab closes, so a
 * missing marker means "this is a fresh tab on a temporary device": sign out.
 * Until that is checked the page is not shown, so nothing flashes on screen.
 *
 * Fails closed: if sessionStorage cannot be read, the user is signed out
 * rather than left in.
 */
export function DeviceSessionGuard({
  temporary,
  children,
}: {
  temporary: boolean;
  children: React.ReactNode;
}) {
  const [verified, setVerified] = useState(!temporary);

  useEffect(() => {
    if (!temporary) return;
    let alive = false;
    try {
      alive = sessionStorage.getItem(TAB_MARKER_KEY) === "1";
    } catch {
      alive = false;
    }
    if (alive) {
      setVerified(true);
      return;
    }
    fetch("/api/auth/device", { method: "DELETE" })
      .catch(() => undefined)
      .finally(() => signOut({ callbackUrl: "/login" }));
  }, [temporary]);

  if (!verified) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Memeriksa perangkat…
      </div>
    );
  }
  return <>{children}</>;
}
