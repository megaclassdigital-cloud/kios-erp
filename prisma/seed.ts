/**
 * Development seed data only (PRD 10, 94: production must never rely on
 * hardcoded/dummy data). Run with `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const passwordHash = await hashPassword("password123");

  const [owner, admin, kasir, staff] = await Promise.all([
    prisma.user.upsert({
      where: { username: "owner" },
      update: {},
      create: { username: "owner", passwordHash, name: "Owner Toko", role: "OWNER" },
    }),
    prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: { username: "admin", passwordHash, name: "Admin Toko", role: "ADMIN" },
    }),
    prisma.user.upsert({
      where: { username: "kasir" },
      update: {},
      create: { username: "kasir", passwordHash, name: "Kasir Toko", role: "KASIR" },
    }),
    prisma.user.upsert({
      where: { username: "staffstok" },
      update: {},
      create: { username: "staffstok", passwordHash, name: "Staff Stok", role: "STAFF_STOK" },
    }),
  ]);

  const sembako = await prisma.category.upsert({
    where: { name: "Sembako" },
    update: {},
    create: { name: "Sembako" },
  });

  const supplier = await prisma.supplier.create({
    data: { name: "PT Sumber Makmur", phone: "08123456789", address: "Jl. Pasar No. 1" },
  });

  const seedProducts: { sku: string; name: string; barcode: string; purchasePrice: string; sellingPrice: string; stock: string }[] = [
    { sku: "SKU-0001", name: "Indomie Goreng", barcode: "8991002101012", purchasePrice: "2750", sellingPrice: "3500", stock: "100" },
    { sku: "SKU-0002", name: "Minyak Goreng 1L", barcode: "8992388100017", purchasePrice: "15500", sellingPrice: "18000", stock: "50" },
    { sku: "SKU-0003", name: "Beras Premium 5kg", barcode: "8998866123456", purchasePrice: "62000", sellingPrice: "68000", stock: "30" },
  ];

  for (const item of seedProducts) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {},
      create: {
        sku: item.sku,
        name: item.name,
        categoryId: sembako.id,
        productType: "PHYSICAL",
        baseUnit: "PCS",
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        minimumStock: 10,
        trackInventory: true,
        currentStock: item.stock,
      },
    });

    await prisma.productBarcode.upsert({
      where: { barcodeValue: item.barcode },
      update: {},
      create: {
        productId: product.id,
        barcodeValue: item.barcode,
        barcodeType: "EAN13",
        unit: "PCS",
        source: "MANUFACTURER",
      },
    });

    const hasMovement = await prisma.stockMovement.findFirst({
      where: { productId: product.id, movementType: "INITIAL_STOCK" },
    });
    if (!hasMovement) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: item.stock,
          movementType: "INITIAL_STOCK",
          referenceType: "SEED",
          referenceId: product.id,
          actorId: owner.id,
        },
      });
    }
  }

  console.log("Seed complete:", {
    users: [owner.username, admin.username, kasir.username, staff.username],
    supplier: supplier.name,
    products: seedProducts.map((p) => p.name),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
