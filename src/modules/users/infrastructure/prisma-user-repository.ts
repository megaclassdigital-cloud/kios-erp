import type { Role, User } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { UserRepository } from "../repository/user-repository";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async create(input: {
    username: string;
    passwordHash: string;
    name: string;
    role: Role;
  }): Promise<User> {
    return this.db.user.create({ data: input });
  }
}
