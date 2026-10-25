-- Per-line promo at the till (nominal or percent).
--
-- Purely additive. unitPriceAtSale keeps the original price; discountAmount is
-- the Rupiah taken off the line (default 0, so every existing sale reads as
-- "no promo"), and subtotal stays "what the customer paid for this line".
ALTER TABLE "sale_items" ADD COLUMN "promoType" TEXT;
ALTER TABLE "sale_items" ADD COLUMN "promoValue" DECIMAL(14,2);
ALTER TABLE "sale_items" ADD COLUMN "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
