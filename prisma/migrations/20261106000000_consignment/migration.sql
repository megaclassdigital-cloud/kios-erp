-- Barang titipan (consignment) and announcement acknowledgements.
-- Additive: new columns on products (default false / null) and new tables.

ALTER TABLE "products" ADD COLUMN "isConsignment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "consignorId" TEXT;

CREATE TABLE "consignments" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consignment_items" (
    "id" TEXT NOT NULL,
    "consignmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "quantityReturned" DECIMAL(14,3) NOT NULL DEFAULT 0,
    CONSTRAINT "consignment_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consignment_payments" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consignment_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "announcement_acks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcement_acks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consignments_number_key" ON "consignments"("number");
CREATE INDEX "consignments_supplierId_createdAt_idx" ON "consignments"("supplierId", "createdAt");
CREATE INDEX "consignment_items_consignmentId_idx" ON "consignment_items"("consignmentId");
CREATE INDEX "consignment_items_productId_idx" ON "consignment_items"("productId");
CREATE INDEX "consignment_payments_supplierId_paidAt_idx" ON "consignment_payments"("supplierId", "paidAt");
CREATE UNIQUE INDEX "announcement_acks_userId_key_key" ON "announcement_acks"("userId", "key");

ALTER TABLE "products" ADD CONSTRAINT "products_consignorId_fkey" FOREIGN KEY ("consignorId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "consignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consignment_payments" ADD CONSTRAINT "consignment_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
