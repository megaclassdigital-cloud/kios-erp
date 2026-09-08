import type { Category } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CategoryRepository } from "../repository/category-repository";

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Db) {}

  async create(name: string): Promise<Category> {
    return this.db.category.create({ data: { name } });
  }

  async update(id: string, name: string): Promise<Category> {
    return this.db.category.update({ where: { id }, data: { name } });
  }

  async list(): Promise<Category[]> {
    return this.db.category.findMany({ orderBy: { name: "asc" } });
  }
}
