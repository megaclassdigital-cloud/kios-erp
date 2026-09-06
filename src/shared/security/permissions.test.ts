import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";
import type { Role } from "@prisma/client";

const ALL_PERMISSIONS = [
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
] as const;

describe("RBAC: OWNER superset invariant", () => {
  it("OWNER can do everything every other role can (PRD 4)", () => {
    const otherRoles: Role[] = ["ADMIN", "KASIR", "STAFF_STOK"];
    for (const role of otherRoles) {
      for (const permission of ALL_PERMISSIONS) {
        if (hasPermission(role, permission)) {
          expect(hasPermission("OWNER", permission)).toBe(true);
        }
      }
    }
  });

  it("KASIR cannot manage products or approve stock opname", () => {
    expect(hasPermission("KASIR", "products.manage")).toBe(false);
    expect(hasPermission("KASIR", "stockopname.approve")).toBe(false);
  });

  it("only OWNER can manage users and view the audit log", () => {
    expect(hasPermission("OWNER", "users.manage")).toBe(true);
    expect(hasPermission("OWNER", "audit.view")).toBe(true);
    for (const role of ["ADMIN", "KASIR", "STAFF_STOK"] as Role[]) {
      expect(hasPermission(role, "users.manage")).toBe(false);
      expect(hasPermission(role, "audit.view")).toBe(false);
    }
  });
});
