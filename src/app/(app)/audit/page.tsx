import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { prisma } from "@/shared/infrastructure/prisma";
import { redirect } from "next/navigation";

/** Owner-only monitoring surface (PRD 4, 74): every sensitive action across
 * every role, with before/after values, in one place. */
export default async function AuditPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "audit.view")) {
    redirect("/dashboard");
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, role: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Audit Log</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Waktu</th>
              <th className="px-3 py-2">Aktor</th>
              <th className="px-3 py-2">Aksi</th>
              <th className="px-3 py-2">Entitas</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-gray-100 align-top">
                <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                  {log.createdAt.toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {log.actor.name} <span className="text-xs text-gray-400">({log.actor.role})</span>
                </td>
                <td className="px-3 py-2 font-medium text-gray-900">{log.action}</td>
                <td className="px-3 py-2 text-gray-500">
                  {log.entityType} #{log.entityId.slice(0, 8)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">
                  {log.afterValue ? JSON.stringify(log.afterValue) : "-"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  Belum ada aktivitas tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
