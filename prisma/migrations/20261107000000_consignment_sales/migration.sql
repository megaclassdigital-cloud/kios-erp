-- Consigned items sold at the till are recorded as they sell (see ConsignmentSale).
CREATE TABLE "consignment_sales" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consignment_sales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consignment_sales_saleItemId_key" ON "consignment_sales"("saleItemId");
CREATE INDEX "consignment_sales_supplierId_idx" ON "consignment_sales"("supplierId");
CREATE INDEX "consignment_sales_productId_idx" ON "consignment_sales"("productId");
CREATE INDEX "consignment_sales_saleId_idx" ON "consignment_sales"("saleId");

ALTER TABLE "consignment_sales" ADD CONSTRAINT "consignment_sales_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sales of consignment products made since their first drop-off, before this
-- table existed, so nothing already sold drops out of what is owed.
INSERT INTO "consignment_sales" ("id", "saleId", "saleItemId", "productId", "supplierId", "quantity", "unitCost")
SELECT gen_random_uuid()::text, si."saleId", si."id", si."productId", p."consignorId", si."quantity", si."costPriceAtSale"
FROM "sale_items" si
JOIN "products" p ON p."id" = si."productId"
JOIN "sales" s ON s."id" = si."saleId"
WHERE p."isConsignment" = true
  AND p."consignorId" IS NOT NULL
  AND s."createdAt" >= (
    SELECT MIN(c."createdAt")
    FROM "consignment_items" ci
    JOIN "consignments" c ON c."id" = ci."consignmentId"
    WHERE ci."productId" = p."id"
  );
