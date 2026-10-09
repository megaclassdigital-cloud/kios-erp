"use client";

import { Suspense, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DevicePrompt } from "./device-prompt";

/** Only ever follow a same-site relative path — a leading "//" would be
 * protocol-relative and could redirect off-site. */
function safeDestination(callbackUrl: string | null): string {
  return callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Set once the password is accepted; the device question is asked before
  // the user is let into the app.
  const [destination, setDestination] = useState<string | null>(null);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const { status } = useSession();

  // The middleware sends a signed-in user here with ?confirm=1 when the device
  // question is still unanswered. They must answer it before going on; they
  // are not asked for the password again because they only just typed it.
  useEffect(() => {
    if (searchParams.get("confirm") === "1" && status === "authenticated") {
      setDestination(safeDestination(searchParams.get("callbackUrl")));
    }
  }, [searchParams, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // signIn() rejects outright when the server can't answer (database
    // unreachable, network dropped). Without this guard the rejection is
    // unhandled, `loading` is never cleared, and the button sits on
    // "Memproses..." forever with nothing telling the cashier why.
    let result;
    try {
      result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
      return;
    } finally {
      setLoading(false);
    }

    if (result?.error) {
      setError("Username atau password salah.");
      return;
    }
    setDestination(safeDestination(searchParams.get("callbackUrl")));
  }

  async function chooseDevice(permanent: boolean) {
    if (!destination) return;
    setDeviceBusy(true);
    setDeviceError(null);
    try {
      const res = await fetch("/api/auth/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permanent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "");
      }
      router.push(destination);
      router.refresh();
    } catch (e) {
      setDeviceError((e as Error).message || "Gagal menyimpan pilihan. Coba lagi.");
      setDeviceBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Kios-ERP</h1>
        <p className="mb-6 text-sm text-gray-500">Masuk untuk melanjutkan</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
      {destination && <DevicePrompt busy={deviceBusy} error={deviceError} onChoose={chooseDevice} />}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
