import { describe, expect, it } from "vitest";
import { InventoryService } from "./inventory-service";

describe("InventoryService.classifyStock", () => {
  const service = new InventoryService();

  it("classifies zero/negative stock as HABIS", () => {
    expect(service.classifyStock(0, 10)).toBe("HABIS");
  });

  it("classifies stock at or below minimum as MENIPIS", () => {
    expect(service.classifyStock(10, 10)).toBe("MENIPIS");
    expect(service.classifyStock(5, 10)).toBe("MENIPIS");
  });

  it("classifies stock above minimum as AMAN", () => {
    expect(service.classifyStock(50, 10)).toBe("AMAN");
  });
});
