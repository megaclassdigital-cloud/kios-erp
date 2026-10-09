# Kios-ERP

Internal retail ERP/POS for a sembako store (kasir, inventory, barcode,
receiving, stock opname, finance, reporting). Next.js (App Router) +
TypeScript + PostgreSQL (Prisma), modular monolith with 7 logical layers.

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Seeded accounts (password: `pass123` for all — see `prisma/seed.ts`):

| username    | role       |
|-------------|------------|
| owner       | OWNER      |
| admin       | ADMIN      |
| kasir       | KASIR      |
| staffstok   | STAFF_STOK |

## Architecture

```
src/
  app/                 # Presentation (pages) + Interface (API routes)
  modules/<feature>/
    domain/            # Value objects, domain services — no framework imports
    application/       # Use cases orchestrating a business event
    repository/        # Interfaces only
    infrastructure/     # Prisma-backed repository implementations
  shared/
    domain/            # Money, Quantity, TransactionNumber
    barcode/           # BarcodeValue normalization
    security/          # auth.ts (NextAuth), permissions.ts (RBAC)
    infrastructure/    # Prisma client, TransactionManager, AuditLogger
```

See `AGENTS.md` for the non-negotiable architecture rules (stock ledger,
barcode lifecycle, atomic checkout, RBAC enforcement, money as Decimal).

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run test` — Vitest unit tests (domain layer)
- `npm run db:migrate` — create/apply a dev migration
- `npm run db:deploy` — apply migrations in production
- `npm run db:seed` — development seed data (never used in production)

## Database connection: pick the right pooler

Supabase exposes two poolers on the same database, and which one `DATABASE_URL`
points at makes a large, measured difference. Six sequential queries on one
Prisma client, from Indonesia against the Sydney project:

| Port | Mode | First query | Steady state |
|------|------|-------------|--------------|
| 6543 | transaction | 4054ms | **~1575ms** |
| 5432 | session | 3264ms | **~318ms** |

The pool is reused in both cases — only the first query pays setup. But the
transaction pooler adds roughly 1250ms to *every* query after that. 318ms is
simply the round trip to the database region; 1575ms is that plus pgbouncer.

- **Locally**, point `DATABASE_URL` at **5432**. `next dev` is a single
  long-lived process and does not need transaction-mode pooling. This cut cold
  page navigation from ~3.7–5.8s to ~2.2–2.6s.
- **On Vercel**, keep **6543**. Serverless functions genuinely need it, and
  there the server sits beside the database, so the overhead is paid over a
  ~1ms link instead of a Sydney-length one.
- `DIRECT_URL` must always be the 5432 one — `prisma migrate` needs a session
  connection and cannot run through the transaction pooler.

Migrations also need the advisory lock disabled, because the pooler does not
support it:

```bash
PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate deploy
```

## Deployment

- **Database**: Supabase Postgres (`DATABASE_URL` in Vercel env vars)
- **Hosting**: Vercel (connected to the `kios-erp` GitHub repo)
- **Repo**: GitHub — `kios-erp` (private)

## Migrations on deploy

A **production** Vercel build runs `prisma migrate deploy` first
(`scripts/migrate-on-deploy.mjs`), so a schema change ships together with the
code that needs it. Previews and local builds skip it. It needs `DIRECT_URL`
(the 5432 session-pooler URL) in Vercel's environment variables; if the
migration fails, the build fails and the previous deployment stays live.

