-- Expiry tracking on the product.
--
-- Purely additive: two new nullable/defaulted columns, no existing column or
-- type is altered or dropped. Existing rows keep working untouched.
--
-- expiryDate is nullable on purpose. A service (pulsa, token listrik) has
-- nothing to expire, and the products that already exist have no date yet.
-- The add-product form requires it for physical goods instead, so a missing
-- date surfaces as something to fill in rather than being silently defaulted
-- to a wrong one.
--
-- expiryWarnDays is per product because the sensible lead time differs: bread
-- needs days of notice, canned goods months.
ALTER TABLE "products"
  ADD COLUMN "expiryDate" TIMESTAMP(3),
  ADD COLUMN "expiryWarnDays" INTEGER NOT NULL DEFAULT 30;
