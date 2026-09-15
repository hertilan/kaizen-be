import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const mockUsers = [
  { userId: "u1", name: "Yvette", email: "yvette@santech.rw", role: "SUPER_ADMIN" as Role, active: true },
  { userId: "u2", name: "Eric Kaizen", email: "eric@kgst.rw", role: "MANAGING_DIRECTOR" as Role, active: true },
  { userId: "u3", name: "Eric Niyonzima", email: "niyonzima@kgst.rw", role: "SYSTEM_ADMIN" as Role, active: true },
  { userId: "u4", name: "Diane Umutoni", email: "diane@kgst.rw", role: "FINANCE_MANAGER" as Role, active: true },
  { userId: "u5", name: "Chantal Mukamana", email: "chantal@kgst.rw", role: "ACCOUNTANT" as Role, active: true },
  { userId: "u6", name: "Emmanuel Bizimana", email: "emmanuel@kgst.rw", role: "OPERATIONS_MANAGER" as Role, active: true },
  { userId: "u7", name: "Aline Uwase", email: "aline@kgst.rw", role: "STORE_MANAGER" as Role, active: true },
  { userId: "u8", name: "Solange Ingabire", email: "solange@kgst.rw", role: "PROCUREMENT_OFFICER" as Role, active: true },
  { userId: "u9", name: "Fabrice Nsengimana", email: "fabrice@kgst.rw", role: "SALES_OFFICER" as Role, active: true },
  { userId: "u10", name: "Claudine Mukashema", email: "claudine@kgst.rw", role: "HR_ADMIN" as Role, active: true },
  { userId: "u11", name: "Vincent Habineza", email: "vincent@kgst.rw", role: "DEPARTMENT_MANAGER" as Role, active: true },
  { userId: "u12", name: "Jean Claude Habimana", email: "jc@kgst.rw", role: "STAFF" as Role, active: true },
  { userId: "u13", name: "Patrick Mugisha", email: "patrick@kgst.rw", role: "STAFF" as Role, active: true },
  { userId: "u14", name: "Emile Nkurunziza", email: "emile@kgst.rw", role: "STOREKEEPER" as Role, active: true },
  { userId: "u15", name: "Grace Uwimana", email: "grace@kgst.rw", role: "AUDITOR" as Role, active: true },
  { userId: "u16", name: "Robert Twagirayezu", email: "robert@kgst.rw", role: "APPROVER" as Role, active: true },
  { userId: "u17", name: "Beatrice Mutesi", email: "beatrice@kgst.rw", role: "VIEWER" as Role, active: true },
];

async function main() {
  console.log("🌱 Starting Kaizen database seed...");

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // Seed Users
  for (const user of mockUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        active: user.active,
      },
      create: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        passwordHash: defaultPasswordHash,
        role: user.role,
        active: user.active,
      },
    });
  }
  console.log(`✅ Seeded ${mockUsers.length} users (default password: Password123!)`);

  // Seed Categories
  const categories = [
    { categoryId: "c1", name: "Plumbing", parentCategoryId: null },
    { categoryId: "c2", name: "Pipes & Fittings", parentCategoryId: "c1" },
    { categoryId: "c3", name: "Electrical", parentCategoryId: null },
    { categoryId: "c4", name: "Cables", parentCategoryId: "c3" },
    { categoryId: "c5", name: "Tools", parentCategoryId: null },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { categoryId: cat.categoryId },
      update: { name: cat.name, parentCategoryId: cat.parentCategoryId },
      create: { categoryId: cat.categoryId, name: cat.name, parentCategoryId: cat.parentCategoryId },
    });
  }
  console.log(`✅ Seeded ${categories.length} categories`);

  // Seed Products
  const products = [
    { productId: "p1", code: "PLB-001", name: 'PVC Pipe 1"', categoryId: "c2", unit: "pcs", purchasePrice: 3500, sellingPrice: 4500, stockQty: 120, reorderLevel: 30, status: "ACTIVE" as const },
    { productId: "p2", code: "PLB-002", name: "Water Tap - Brass", categoryId: "c1", unit: "pcs", purchasePrice: 8000, sellingPrice: 11000, stockQty: 18, reorderLevel: 20, status: "ACTIVE" as const },
    { productId: "p3", code: "ELC-001", name: "Cable 2.5mm (100m roll)", categoryId: "c4", unit: "roll", purchasePrice: 45000, sellingPrice: 58000, stockQty: 6, reorderLevel: 10, status: "ACTIVE" as const },
    { productId: "p4", code: "ELC-002", name: "Circuit Breaker 20A", categoryId: "c3", unit: "pcs", purchasePrice: 6000, sellingPrice: 8500, stockQty: 0, reorderLevel: 15, status: "ACTIVE" as const },
    { productId: "p5", code: "TLS-001", name: 'Pipe Wrench 14"', categoryId: "c5", unit: "pcs", purchasePrice: 12000, sellingPrice: 16000, stockQty: 9, reorderLevel: 5, status: "ACTIVE" as const },
    { productId: "p6", code: "PLB-003", name: 'Elbow Joint 1"', categoryId: "c2", unit: "pcs", purchasePrice: 800, sellingPrice: 1200, stockQty: 300, reorderLevel: 50, status: "INACTIVE" as const },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { productId: prod.productId },
      update: prod,
      create: prod,
    });
  }
  console.log(`✅ Seeded ${products.length} products`);

  // Seed Suppliers
  const suppliers = [
    {
      supplierId: "s1",
      name: "Kigali Hardware Supplies Ltd",
      contactPerson: "Jean Bosco",
      phone: "0788 123 456",
      email: "sales@kigalihardware.rw",
      address: "Nyabugogo, Kigali",
      productsSupplied: ["p1", "p2", "p6"],
    },
    {
      supplierId: "s2",
      name: "ElectroPlus Rwanda",
      contactPerson: "Divine Iradukunda",
      phone: "0722 987 654",
      email: "info@electroplus.rw",
      address: "Remera, Kigali",
      productsSupplied: ["p3", "p4"],
    },
    {
      supplierId: "s3",
      name: "BuildTools Africa",
      contactPerson: "Patrick Nshuti",
      phone: "0733 555 222",
      email: "contact@buildtools.africa",
      address: "Kicukiro, Kigali",
      productsSupplied: ["p5"],
    },
  ];

  for (const supp of suppliers) {
    await prisma.supplier.upsert({
      where: { supplierId: supp.supplierId },
      update: supp,
      create: supp,
    });
  }
  console.log(`✅ Seeded ${suppliers.length} suppliers`);

  console.log("🎉 Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
