-- One product can carry more than one barcode (PRD 45: an extra carton/box
-- barcode alongside the base unit's), but never two ACTIVE barcodes for the
-- *same* unit at the same time -- that would leave two live codes resolving
-- to the same line item, splitting which one actually gets scanned/tracked
-- going forward. Application code already guards this
-- (BarcodeDomainService.assertNoActiveBarcodeForUnit); this partial unique
-- index makes it a hard database guarantee instead of just a convention,
-- so no future code path can reintroduce it. RETIRED rows are untouched
-- and unlimited, preserving full historical/audit trail.
CREATE UNIQUE INDEX "product_barcodes_one_active_per_unit"
  ON "product_barcodes" ("productId", "unit")
  WHERE "status" = 'ACTIVE';
