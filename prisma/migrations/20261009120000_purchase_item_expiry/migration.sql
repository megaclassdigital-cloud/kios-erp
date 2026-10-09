-- Remember the expiry date a delivery arrived with, on the receiving line.
--
-- Purely additive: one nullable column, nothing altered or dropped. Existing
-- purchase lines simply have no date (shown as "-" in the receiving history).
-- Product.expiryDate stays the live "what is on the shelf" value; this is the
-- historical record of what each delivery said.
ALTER TABLE "purchase_items" ADD COLUMN "expiryDate" TIMESTAMP(3);
