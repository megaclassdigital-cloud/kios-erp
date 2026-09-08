-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('PULSA', 'TOKEN_LISTRIK');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "serviceProvider" TEXT,
ADD COLUMN     "serviceType" "ServiceType";

-- CreateTable
CREATE TABLE "service_sale_details" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "provider" TEXT,
    "phoneNumber" TEXT,
    "meterNumber" TEXT,
    "customerNumber" TEXT,
    "nominal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_sale_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_sale_details_saleItemId_key" ON "service_sale_details"("saleItemId");

-- AddForeignKey
ALTER TABLE "service_sale_details" ADD CONSTRAINT "service_sale_details_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
