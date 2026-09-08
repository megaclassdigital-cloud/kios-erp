import type { Supplier } from "@prisma/client";

export interface UpdateSupplierInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  active?: boolean;
}

export interface SupplierRepository {
  create(input: { name: string; phone?: string; address?: string; notes?: string }): Promise<Supplier>;
  update(id: string, input: UpdateSupplierInput): Promise<Supplier>;
  list(): Promise<Supplier[]>;
}
