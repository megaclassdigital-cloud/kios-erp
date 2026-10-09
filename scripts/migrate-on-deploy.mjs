// Applies pending Prisma migrations as part of a PRODUCTION Vercel build, so a
// schema change ships with the code that needs it and nobody has to run
// `prisma migrate deploy` by hand.
//
// - Only on production deploys. Previews and local builds skip it, so a branch
//   preview can never alter the live database.
// - Uses DIRECT_URL (session pooler, port 5432). `migrate` cannot run through
//   the transaction pooler, and the pooler does not support the advisory lock,
//   hence the flag below (see README, "Database connection").
// - If it fails, the build fails and Vercel keeps serving the previous
//   deployment, so code that needs a missing column never goes live.
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] skipped: not a production deploy.");
  process.exit(0);
}

if (!process.env.DIRECT_URL) {
  console.error(
    "[migrate] DIRECT_URL is not set in Vercel's environment variables. Add it (the 5432 session-pooler URL) so migrations can run."
  );
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "true" },
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
