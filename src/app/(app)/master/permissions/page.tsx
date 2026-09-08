import { auth } from "@/shared/security/auth";
import { hasPermission, listAllPermissions, listRolePermissions } from "@/shared/security/permissions";
import { redirect } from "next/navigation";

const ROLES = ["OWNER", "ADMIN", "KASIR", "STAFF_STOK"] as const;

/** Read-only matrix (PRD 6). Permissions are defined in code (PRD 5:
 * backend-enforced RBAC) — this page shows the source of truth rather than
 * a separately editable copy that could drift from what's actually
 * enforced in requireSession(). */
export default async function PermissionsPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "users.manage")) {
    redirect("/dashboard");
  }

  const matrix = listRolePermissions();
  const permissions = listAllPermissions();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Permissions</h1>
      <p className="text-sm text-gray-500">
        Daftar hak akses per role. Diverifikasi di backend pada setiap API — tampilan ini bersifat
        informasi, bukan pengaturan terpisah.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Permission</th>
              {ROLES.map((role) => (
                <th key={role} className="px-3 py-2 text-center">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission} className="border-t border-gray-100">
                <td className="px-3 py-2 font-mono text-xs text-gray-700">{permission}</td>
                {ROLES.map((role) => (
                  <td key={role} className="px-3 py-2 text-center">
                    {matrix[role].includes(permission) ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
