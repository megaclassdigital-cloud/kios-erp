import { describe, expect, it } from "vitest";
import { deriveDirectUrl } from "../../../scripts/migrate-on-deploy.mjs";

describe("deriveDirectUrl", () => {
  it("moves the transaction pooler URL to the session port and drops pgbouncer params", () => {
    const out = new URL(
      deriveDirectUrl("postgresql://postgres.abc:secret@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require")
    );
    expect(out.port).toBe("5432");
    expect(out.hostname).toBe("aws-0-ap-southeast-2.pooler.supabase.com");
    expect(out.username).toBe("postgres.abc");
    expect(out.password).toBe("secret");
    expect(out.searchParams.get("pgbouncer")).toBeNull();
    expect(out.searchParams.get("connection_limit")).toBeNull();
    expect(out.searchParams.get("sslmode")).toBe("require");
  });
});
