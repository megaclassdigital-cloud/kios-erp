import type { Role } from "@prisma/client";

export type Permission =
  | "dashboard.view"
  | "pos.operate"
  | "pos.shift"
  | "products.manage"
  | "barcode.manage"
  | "inventory.view"
  | "inventory.adjust"
  | "receiving.manage"
  | "stockopname.manage"
  | "stockopname.approve"
  | "transactions.view"
  | "transactions.view_all"
  | "finance.manage"
  | "reports.view"
  | "suppliers.manage"
  | "users.manage"
  | "refund.manage"
  | "audit.view"
  | "shifts.monitor";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [
    "dashboard.view",
    "pos.operate",
    "pos.shift",
    "products.manage",
    "barcode.manage",
    "inventory.view",
    "inventory.adjust",
    "receiving.manage",
    "stockopname.manage",
    "stockopname.approve",
    "transactions.view",
    "transactions.view_all",
    "finance.manage",
    "reports.view",
    "suppliers.manage",
    "users.manage",
    "refund.manage",
    "audit.view",
    "shifts.monitor",
  ],
  ADMIN: [
    "dashboard.view",
    "products.manage",
    "barcode.manage",
    "inventory.view",
    "inventory.adjust",
    "receiving.manage",
    "stockopname.manage",
    "stockopname.approve",
    "transactions.view",
    "transactions.view_all",
    "finance.manage",
    "reports.view",
    "suppliers.manage",
    "refund.manage",
    "shifts.monitor",
  ],
  KASIR: [
    "dashboard.view",
    "pos.operate",
    "pos.shift",
    "transactions.view",
    "inventory.view",
    "receiving.manage",
  ],
  STAFF_STOK: [
    "dashboard.view",
    "inventory.view",
    "receiving.manage",
    "stockopname.manage",
  ],
};

/**
 * OWNER is defined as the union of every other role's permissions (PRD 4:
 * owner has full access). Asserted at module load so a future permission
 * added only to ADMIN/KASIR/STAFF_STOK can never silently leave OWNER
 * behind.
 */
function assertOwnerIsSuperset() {
  const ownerSet = new Set(ROLE_PERMISSIONS.OWNER);
  for (const role of ["ADMIN", "KASIR", "STAFF_STOK"] as const) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      if (!ownerSet.has(permission)) {
        throw new Error(
          `RBAC misconfiguration: OWNER is missing permission "${permission}" granted to ${role}.`
        );
      }
    }
  }
}
assertOwnerIsSuperset();

/** Backend-enforced RBAC check (PRD 5). Hiding a button client-side is
 * never sufficient — every mutating route handler must call this. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export class ForbiddenError extends Error {
  constructor(message = "Anda tidak memiliki izin untuk melakukan aksi ini.") {
    super(message);
  }
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError();
  }
}

/** Read-only view of the role→permission matrix for the Permissions admin
 * page (PRD 6: secondary administration). Permissions are defined in code,
 * not the database — this exposes that source of truth rather than
 * duplicating it. */
export function listRolePermissions(): Record<Role, Permission[]> {
  return ROLE_PERMISSIONS;
}

export function listAllPermissions(): Permission[] {
  return Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat())).sort();
}
