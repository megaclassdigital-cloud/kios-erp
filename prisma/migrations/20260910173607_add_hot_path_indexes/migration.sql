-- CreateIndex
CREATE INDEX "cashier_shifts_cashierId_status_idx" ON "cashier_shifts"("cashierId", "status");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate");

-- CreateIndex
CREATE INDEX "payments_saleId_idx" ON "payments"("saleId");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sales_status_paidAt_idx" ON "sales"("status", "paidAt");

-- CreateIndex
CREATE INDEX "sales_cashierId_createdAt_idx" ON "sales"("cashierId", "createdAt");
