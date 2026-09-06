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

Seeded accounts (password: `password123` for all):

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

## Deployment

- **Database**: Supabase Postgres (`DATABASE_URL` in Vercel env vars)
- **Hosting**: Vercel (connected to the `kios-erp` GitHub repo)
- **Repo**: GitHub — `kios-erp` (private)
