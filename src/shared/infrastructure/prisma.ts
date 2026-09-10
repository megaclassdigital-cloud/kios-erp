import { PrismaClient } from "@prisma/client";

// globalThis, not Node's `global` — Turbopack doesn't polyfill `global` in
// every module-evaluation context (webpack did), and globalThis is the
// standardized reference that works identically across bundlers/runtimes.
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
