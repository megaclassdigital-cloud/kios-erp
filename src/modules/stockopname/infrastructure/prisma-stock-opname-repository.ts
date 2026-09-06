import type { StockOpname } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type {
  StockOpnameLineInput,
  StockOpnameRepository,
} from "../repository/stock-opname-repository";

export class PrismaStockOpnameRepository implements StockOpnameRepository {
  constructor(private readonly db: Db) {}

  async create(startedById: string, opnameNumber: string): Promise<StockOpname> {
    return this.db.stockOpname.create({
      data: { startedById, opnameNumber, status: "DRAFT" },
    });
  }

  async submit(id: string, items: StockOpnameLineInput[]): Promise<StockOpname> {
    await this.db.stockOpnameItem.createMany({
      data: items.map((item) => ({ ...item, stockOpnameId: id })),
    });
    return this.db.stockOpname.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
      include: { items: { include: { product: true } } },
    });
  }

  async approve(id: string, approvedById: string): Promise<StockOpname> {
    return this.db.stockOpname.update({
      where: { id },
      data: { status: "APPROVED", approvedById, approvedAt: new Date() },
    });
  }

  async findById(id: string) {
    return this.db.stockOpname.findUnique({
      where: { id },
      include: { items: true },
    });
  }
}
