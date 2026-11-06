-- Catch-up entries: consigned units sold but never rung up at the till have no sale behind them.
ALTER TABLE "consignment_sales" ALTER COLUMN "saleId" DROP NOT NULL;
ALTER TABLE "consignment_sales" ALTER COLUMN "saleItemId" DROP NOT NULL;
ALTER TABLE "consignment_sales" ADD COLUMN "soldAt" TIMESTAMP(3);
ALTER TABLE "consignment_sales" ADD COLUMN "note" TEXT;
ALTER TABLE "consignment_sales" ADD COLUMN "createdById" TEXT;
