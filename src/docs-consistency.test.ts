import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Keeps the agent-facing docs honest. If this fails you changed code the docs
 * describe: update docs/API.md, docs/PROJECT_CONTEXT.md and docs/CHANGELOG.md
 * in the same commit (see "Dokumentasi" in AGENTS.md).
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function routes(dir = "src/app/api"): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) return routes(rel);
    return name === "route.ts" ? [rel] : [];
  });
}

describe("docs/API.md", () => {
  const documented = new Map<string, { methods: string; permission: string }>();
  for (const line of read("docs/API.md").split("\n")) {
    const m = /^\| `([^`]+)` \| ([^|]*) \| ([^|]*) \|/.exec(line);
    if (m) documented.set(m[1], { methods: m[2].trim(), permission: m[3].trim() });
  }

  const actual = routes().map((file) => {
    const src = readFileSync(join(root, file), "utf8");
    const route = file.replace("src/app", "").replace("/route.ts", "");
    const methods = [...src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]).join(",");
    const permissions = [...new Set([...src.matchAll(/requireSession\("([a-z_.]+)"\)/g)].map((m) => m[1]))].join(",");
    return { route, methods: methods || "-", permissions: permissions || "-" };
  });

  it("lists every route, and only routes that exist", () => {
    expect([...documented.keys()].sort()).toEqual(actual.map((a) => a.route).sort());
  });

  it("states the same methods and permission as the code", () => {
    for (const a of actual) {
      const d = documented.get(a.route);
      expect(d, a.route).toBeDefined();
      expect(d!.methods, `${a.route} methods`).toBe(a.methods);
      expect(d!.permission, `${a.route} permission`).toBe(a.permissions);
    }
  });
});

describe("docs/PROJECT_CONTEXT.md", () => {
  it("only points at files and folders that exist", () => {
    const text = read("docs/PROJECT_CONTEXT.md");
    const paths = new Set([...text.matchAll(/`((?:src|docs|prisma|scripts)\/[A-Za-z0-9_\-./()\[\]]+)`/g)].map((m) => m[1]));
    const missing = [...paths].filter((p) => !p.includes("*") && !p.includes("<") && !existsSync(join(root, p.replace(/\/$/, ""))));
    expect(missing).toEqual([]);
  });

  it("is linked from README and AGENTS.md, with the changelog and API list beside it", () => {
    expect(read("README.md")).toContain("docs/PROJECT_CONTEXT.md");
    expect(read("AGENTS.md")).toContain("docs/PROJECT_CONTEXT.md");
    for (const f of ["docs/API.md", "docs/CHANGELOG.md"]) expect(existsSync(join(root, f))).toBe(true);
  });
});
