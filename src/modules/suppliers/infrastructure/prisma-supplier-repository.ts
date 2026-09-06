import type { Supplier } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { SupplierRepository } from "../repository/supplier-repository";

export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly db: Db) {}

  async create(input: { name: string; phone?: string; address?: string; notes?: string }): Promise<Supplier> {
    return this.db.supplier.create({ data: input });
  }

  async list(): Promise<Supplier[]> {
    return this.db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }
}
