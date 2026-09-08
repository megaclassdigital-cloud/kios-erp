import type { Category } from "@prisma/client";

export interface CategoryRepository {
  create(name: string): Promise<Category>;
  update(id: string, name: string): Promise<Category>;
  list(): Promise<Category[]>;
}
