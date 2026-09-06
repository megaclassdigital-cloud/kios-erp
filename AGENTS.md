<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kios-ERP architecture rules

Full requirements live in the PRD the user provided at project start (not
checked into this repo). Key non-negotiables when touching this codebase:

- **7 logical layers, modular monolith.** `src/modules/<feature>/{domain,application,repository,infrastructure}`
  plus `src/app/api/**` (interface) and `src/app/**` pages (presentation).
  Presentation never queries the database. Domain never imports Prisma/Next.
  Application never calls `prisma.*` directly — always through a Repository
  interface implemented in that module's `infrastructure/`.
- **Stock is never set directly.** Every stock change is a `StockMovement`
  row plus a `Product.currentStock` projection update, both inside the same
  DB transaction (`TransactionManager`). No bare `product.stock = x`.
- **Barcode is an identifier, not a data store.** Price/name/stock live on
  Product and can change; the barcode value never encodes them. Retired
  barcodes are never reused (`ProductBarcode.status`, never hard-deleted).
- **Money is Decimal, never float.** Use `Decimal.js` / Prisma `Decimal`
  end-to-end; `Money`/`Quantity` value objects in `src/shared/domain/`.
- **Historical sales freeze price/cost at `SaleItem.unitPriceAtSale` /
  `costPriceAtSale`.** Reports must read these snapshots, never the live
  `Product.sellingPrice`/`purchasePrice`.
- **Checkout and receiving are atomic.** One `prisma.$transaction` creates
  the Sale/Purchase, its line items, StockMovements, and Payment together.
  Cashless confirmation is idempotent (`Payment.idempotencyKey` unique).
- **RBAC is enforced server-side.** Every API route calls `requireSession`
  with a `Permission` from `src/shared/security/permissions.ts` — hiding a
  button client-side is not authorization.
- **No god files.** Keep modules under ~300 lines; split by responsibility
  before that, not after.

