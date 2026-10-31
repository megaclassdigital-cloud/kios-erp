-- Aset Toko: editable categories, and the unused "location" field removed.

CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asset_categories_name_key" ON "asset_categories"("name");

-- The six categories the page started with, plus any name an existing asset
-- already uses, so nothing recorded so far loses its category.
INSERT INTO "asset_categories" ("id", "name") VALUES
  (gen_random_uuid()::text, 'Pendingin & Freezer'),
  (gen_random_uuid()::text, 'Rak & Perabot'),
  (gen_random_uuid()::text, 'Timbangan & Alat Ukur'),
  (gen_random_uuid()::text, 'Elektronik & Kasir'),
  (gen_random_uuid()::text, 'Kendaraan'),
  (gen_random_uuid()::text, 'Peralatan Lain')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "asset_categories" ("id", "name")
SELECT gen_random_uuid()::text, "category" FROM (SELECT DISTINCT "category" FROM "assets") used
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "assets" DROP COLUMN IF EXISTS "location";
