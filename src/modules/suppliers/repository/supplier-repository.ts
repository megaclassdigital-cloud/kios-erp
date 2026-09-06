import type { Supplier } from "@prisma/client";

export interface SupplierRepository {
  create(input: { name: string; phone?: string; address?: string; notes?: string }): Promise<Supplier>;
  list(): Promise<Supplier[]>;
}
