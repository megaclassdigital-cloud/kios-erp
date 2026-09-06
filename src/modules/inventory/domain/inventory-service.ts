export type StockStatus = "AMAN" | "MENIPIS" | "HABIS";

/** Pure calculation, no persistence (PRD 22-23). */
export class InventoryService {
  classifyStock(currentStock: number, minimumStock: number): StockStatus {
    if (currentStock <= 0) return "HABIS";
    if (currentStock <= minimumStock) return "MENIPIS";
    return "AMAN";
  }
}
