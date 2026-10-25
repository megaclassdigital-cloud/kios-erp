import { describe, expect, it } from "vitest";
import { coreSimilarity, parseName } from "./product-name";

describe("parseName", () => {
  it("separates the size from the name and normalises spellings", () => {
    for (const name of ["Indomie Goreng 70g", "Indomie Goreng 70 gr", "indomie goreng 70 GRAM"]) {
      const p = parseName(name);
      expect(p.core).toEqual(["goreng", "indomie"]);
      expect(p.sizes).toEqual(["70g"]);
    }
  });

  it("converts kg and litres to the base unit", () => {
    expect(parseName("Gula 1 kg").sizes).toEqual(["1000g"]);
    expect(parseName("Gula 1000g").sizes).toEqual(["1000g"]);
    expect(parseName("Minyak 0,25 L").sizes).toEqual(["250ml"]);
    expect(parseName("Minyak 250ml").sizes).toEqual(["250ml"]);
  });

  it("reads multipacks and pack counts", () => {
    expect(parseName("Indomie Goreng 5x70g").sizes).toEqual(["5x70g"]);
    expect(parseName("Teh Celup isi 25").sizes).toEqual(["x25"]);
  });

  it("does not eat letters that merely start like a unit", () => {
    expect(parseName("Gelas 2 lusin").sizes).toEqual([]);
    expect(parseName("Kopi Gula Aren").core).toEqual(["aren", "gula", "kopi"]);
  });

  it("has no size when none is written", () => {
    expect(parseName("Sabun Lifebuoy").sizes).toEqual([]);
  });
});

describe("coreSimilarity", () => {
  it("is 1 for the same words in any order", () => {
    expect(coreSimilarity(parseName("Kecap Manis ABC").core, parseName("ABC Kecap Manis").core)).toBe(1);
  });

  it("tolerates one typo in a long word", () => {
    expect(coreSimilarity(parseName("Indomie Gorengg").core, parseName("Indomie Goreng").core)).toBe(1);
  });

  it("scores a longer name that contains the shorter one high but not 1", () => {
    const s = coreSimilarity(parseName("Indomie Goreng").core, parseName("Indomie Goreng Spesial").core);
    expect(s).toBeGreaterThanOrEqual(0.75);
    expect(s).toBeLessThan(1);
  });

  it("keeps different flavours apart", () => {
    expect(coreSimilarity(parseName("Indomie Goreng").core, parseName("Indomie Soto").core)).toBeLessThan(0.75);
  });
});
