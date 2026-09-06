import type { Role } from "@prisma/client";
import { prisma } from "@/shared/infrastructure/prisma";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";

export interface UpdateUserRequest {
  userId: string;
  name?: string;
  role?: Role;
  active?: boolean;
  actorId: string;
}

/** Owner-only (PRD 4, 74: role/active changes are sensitive and audited). */
export class UpdateUserUseCase {
  async execute(req: UpdateUserRequest) {
    const before = await prisma.user.findUnique({ where: { id: req.userId } });
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name: req.name, role: req.role, active: req.active },
    });

    const audit = new AuditLogger(prisma);
    await audit.record({
      actorId: req.actorId,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: user.id,
      beforeValue: before ? { role: before.role, active: before.active } : undefined,
      afterValue: { role: user.role, active: user.active },
    });

    return user;
  }
}
