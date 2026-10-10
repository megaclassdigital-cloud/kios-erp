-- Soft delete for products.
--
-- Purely additive: one nullable column, nothing altered or dropped. A product
-- is "deleted" by stamping this column (and deactivating it and retiring its
-- barcodes), never by removing the row, so past sales, receipts and the stock
-- ledger keep their foreign keys and barcode values are never reused.
ALTER TABLE "products" ADD COLUMN "deletedAt" TIMESTAMP(3);
