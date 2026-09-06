import type { Role, User } from "@prisma/client";

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: {
    username: string;
    passwordHash: string;
    name: string;
    role: Role;
  }): Promise<User>;
}
