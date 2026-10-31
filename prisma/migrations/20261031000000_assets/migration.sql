-- Aset toko: equipment register. Purely additive (new enum, new table); stock,
-- sales and expenses are untouched.
CREATE TYPE "AssetCondition" AS ENUM ('BAIK', 'PERLU_PERBAIKAN', 'RUSAK', 'DIJUAL', 'HILANG');

CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasePrice" DECIMAL(14,2) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "condition" "AssetCondition" NOT NULL DEFAULT 'BAIK',
    "location" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assets_deletedAt_idx" ON "assets"("deletedAt");

ALTER TABLE "assets" ADD CONSTRAINT "assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
