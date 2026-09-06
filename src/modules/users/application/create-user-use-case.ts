import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaUserRepository } from "../infrastructure/prisma-user-repository";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";

export interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  role: Role;
  actorId: string;
}

/** Owner-only (PRD 4: user management is exclusive to OWNER). */
export class CreateUserUseCase {
  async execute(req: CreateUserRequest) {
    const users = new PrismaUserRepository(prisma);
    const existing = await users.findByUsername(req.username);
    if (existing) {
      throw new Error("Username sudah digunakan.");
    }

    const passwordHash = await bcrypt.hash(req.password, 10);
    const user = await users.create({
      username: req.username,
      passwordHash,
      name: req.name,
      role: req.role,
    });

    const audit = new AuditLogger(prisma);
    await audit.record({
      actorId: req.actorId,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      afterValue: { username: user.username, role: user.role },
    });

    return user;
  }
}
