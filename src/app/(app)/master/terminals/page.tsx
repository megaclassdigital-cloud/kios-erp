import { redirect } from "next/navigation";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { ListTerminalsUseCase } from "@/modules/terminals/application/terminal-use-cases";
import { PageHeader } from "@/components/kios/page-header";
import { EmptyState } from "@/components/kios/empty-state";
import { StatusBadge } from "@/components/kios/status-badge";

function formatDateTime(value: Date) {
  return value.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Answers the operational question that justified storing hardware in the
 * database rather than in each browser: which till has a scanner, and which
 * one has gone quiet. */
export default async function TerminalsPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "terminals.view")) {
    redirect("/dashboard");
  }

  const terminals = await new ListTerminalsUseCase().execute();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Terminal & Perangkat"
        description="Mesin kasir yang terdaftar beserta scanner dan printer yang terpasang di masing-masing."
      />

      {terminals.length === 0 ? (
        <EmptyState title="Belum ada terminal terdaftar. Buka halaman Kasir di mesin kasir untuk mendaftarkannya." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Terminal</th>
                <th className="px-3 py-2">Perangkat</th>
                <th className="px-3 py-2">Profil</th>
                <th className="px-3 py-2">Terakhir Dipakai</th>
                <th className="px-3 py-2">Terminal Aktif</th>
              </tr>
            </thead>
            <tbody>
              {terminals.map((terminal) =>
                terminal.devices.length === 0 ? (
                  <tr key={terminal.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{terminal.name}</td>
                    <td className="px-3 py-2" colSpan={3}>
                      <StatusBadge tone="warning">Belum ada perangkat</StatusBadge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {formatDateTime(terminal.lastSeenAt)}
                    </td>
                  </tr>
                ) : (
                  terminal.devices.map((device, index) => (
                    <tr key={`${terminal.id}-${device.kind}`} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-foreground">
                        {index === 0 ? terminal.name : ""}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge tone="success">{device.kind}</StatusBadge>{" "}
                        <span className="text-muted-foreground">{device.label}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {device.medianIntervalMs !== null
                          ? `${device.codeLength} karakter · jeda ${device.medianIntervalMs}ms · ${
                              device.terminator === "idle"
                                ? "tanpa suffix"
                                : `suffix ${device.terminator?.toUpperCase()}`
                            }`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">
                        {device.lastUsedAt ? formatDateTime(device.lastUsedAt) : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">
                        {index === 0 ? formatDateTime(terminal.lastSeenAt) : ""}
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
