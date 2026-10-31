import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOURS, tourFor } from "./tour-steps";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(name) ? [path] : [];
  });
}

describe("guided tour", () => {
  const sources = sourceFiles(join(process.cwd(), "src/app")).map((f) => readFileSync(f, "utf8")).join("\n");

  it("every highlighted element exists in the code, so a rename cannot silently empty a step", () => {
    const missing: string[] = [];
    for (const [path, steps] of Object.entries(TOURS)) {
      for (const step of steps) {
        if (!step.target) continue;
        const present = sources.includes(`data-tour="${step.target}"`) || sources.includes(`tour="${step.target}"`);
        if (!present) missing.push(`${path} -> ${step.target}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("has a tour for the newer pages", () => {
    expect(tourFor("/aset")?.length).toBeGreaterThan(0);
    expect(tourFor("/barang-keluar")?.length).toBeGreaterThan(0);
  });

  it("every step has a title and a body", () => {
    for (const steps of Object.values(TOURS)) for (const s of steps) expect(s.title && s.body).toBeTruthy();
  });
});
