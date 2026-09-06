import { describe, expect, it } from "vitest";
import {
  BarcodeAlreadyLinkedError,
  BarcodeDomainService,
  BarcodeRetiredError,
} from "./barcode-domain-service";

describe("BarcodeDomainService", () => {
  const service = new BarcodeDomainService();

  it("formats a sequence into the KERP internal barcode scheme", () => {
    expect(service.formatInternalBarcode(1n)).toBe("KERP000000000001");
  });

  it("rejects attaching a barcode already linked to a different product", () => {
    expect(() => service.assertCanAttach("product-A", "product-B")).toThrow(
      BarcodeAlreadyLinkedError
    );
  });

  it("allows re-attaching to the same product it already belongs to", () => {
    expect(() => service.assertCanAttach("product-A", "product-A")).not.toThrow();
  });

  it("allows attaching an unclaimed barcode", () => {
    expect(() => service.assertCanAttach(null, "product-A")).not.toThrow();
  });

  it("rejects using a retired barcode (PRD 36, 82: no recycling)", () => {
    expect(() => service.assertNotRetired("RETIRED")).toThrow(BarcodeRetiredError);
    expect(() => service.assertNotRetired("ACTIVE")).not.toThrow();
  });
});
