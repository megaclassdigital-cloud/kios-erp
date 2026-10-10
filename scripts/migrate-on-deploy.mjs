// Applies pending Prisma migrations as part of a PRODUCTION Vercel build, so a
// schema change ships with the code that needs it and nobody has to run
// `prisma migrate deploy` by hand.
//
// - Only on production deploys. Previews and local builds skip it, so a branch
//   preview can never alter the live database.
// - `migrate` needs a session connection (port 5432), not the transaction
//   pooler (6543) the app itself uses on Vercel, and the pooler does not
//   support the advisory lock, hence the flag below (see README, "Database
//   connection"). DIRECT_URL is used when it is set; when it is not, the 5432
//   URL is derived from DATABASE_URL (same host, same credentials), so a
//   missing variable does not leave the database one migration behind.
// - If it fails, the build fails and Vercel keeps serving the previous
//   deployment, so code that needs a missing column never goes live.
import { spawnSync } from "node:child_process";

export function deriveDirectUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  url.port = "5432";
  // Parameters that only make sense for the transaction pooler.
  for (const key of ["pgbouncer", "connection_limit", "pool_timeout"]) url.searchParams.delete(key);
  return url.toString();
}

function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("[migrate] skipped: not a production deploy.");
    return 0;
  }

  let directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    if (!process.env.DATABASE_URL) {
      console.error("[migrate] Neither DIRECT_URL nor DATABASE_URL is set in Vercel's environment variables.");
      return 1;
    }
    directUrl = deriveDirectUrl(process.env.DATABASE_URL);
    console.log("[migrate] DIRECT_URL not set; using DATABASE_URL on port 5432.");
  }

  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DIRECT_URL: directUrl, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "true" },
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

// Only run when executed directly, so the helper can be imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
