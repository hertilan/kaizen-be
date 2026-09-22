import { PrismaClient, Role, ProductStatus, PaymentStatus, StockTransactionType, ExpenseCategory, PaymentMethod, PaymentDirection, TaskStatus, TaskPriority, AlertKind } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const mockUsers = [
  { userId: "u1", name: "Yvette", email: "yvette@santech.rw", role: "SUPER_ADMIN" as Role, active: true },
  { userId: "u2", name: "Eric Kaizen", email: "eric@kgst.rw", role: "ADMIN" as Role, active: true },
  { userId: "u3", name: "Diane Umutoni", email: "diane@kgst.rw", role: "FINANCE" as Role, active: true },
  { userId: "u4", name: "Fabrice Nsengimana", email: "fabrice@kgst.rw", role: "RETAILER" as Role, active: true },
  { userId: "u5", name: "Aline Uwase", email: "aline@kgst.rw", role: "WHOLESALE" as Role, active: true },
  { userId: "u6", name: "Emmanuel Bizimana", email: "emmanuel@kgst.rw", role: "ENGINEER" as Role, active: true },
];


async function main() {
  console.log("🌱 Starting comprehensive Kaizen database seed...");

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 1. Seed Users
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

  // 2. Seed Categories
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

  // 3. Seed Products
  const products = [
    { productId: "p1", code: "PLB-001", name: 'PVC Pipe 1"', categoryId: "c2", unit: "pcs", purchasePrice: 3500, sellingPrice: 4500, stockQty: 120, reorderLevel: 30, status: "ACTIVE" as ProductStatus },
    { productId: "p2", code: "PLB-002", name: "Water Tap - Brass", categoryId: "c1", unit: "pcs", purchasePrice: 8000, sellingPrice: 11000, stockQty: 18, reorderLevel: 20, status: "ACTIVE" as ProductStatus },
    { productId: "p3", code: "ELC-001", name: "Cable 2.5mm (100m roll)", categoryId: "c4", unit: "roll", purchasePrice: 45000, sellingPrice: 58000, stockQty: 6, reorderLevel: 10, status: "ACTIVE" as ProductStatus },
    { productId: "p4", code: "ELC-002", name: "Circuit Breaker 20A", categoryId: "c3", unit: "pcs", purchasePrice: 6000, sellingPrice: 8500, stockQty: 0, reorderLevel: 15, status: "ACTIVE" as ProductStatus },
    { productId: "p5", code: "TLS-001", name: 'Pipe Wrench 14"', categoryId: "c5", unit: "pcs", purchasePrice: 12000, sellingPrice: 16000, stockQty: 9, reorderLevel: 5, status: "ACTIVE" as ProductStatus },
    { productId: "p6", code: "PLB-003", name: 'Elbow Joint 1"', categoryId: "c2", unit: "pcs", purchasePrice: 800, sellingPrice: 1200, stockQty: 300, reorderLevel: 50, status: "INACTIVE" as ProductStatus },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { productId: prod.productId },
      update: prod,
      create: prod,
    });
  }
  console.log(`✅ Seeded ${products.length} products`);

  // 4. Seed Suppliers
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

  // 5. Seed Purchases & PurchaseItems
  const purchases = [
    {
      purchaseId: "pu1",
      purchaseNumber: "PUR-2026-001",
      supplierId: "s1",
      date: new Date("2026-08-20"),
      paymentStatus: "PAID" as PaymentStatus,
      notes: "Initial inventory bulk order",
      items: [
        { productId: "p1", quantity: 100, unitPrice: 3500 },
        { productId: "p6", quantity: 300, unitPrice: 800 },
      ],
    },
    {
      purchaseId: "pu2",
      purchaseNumber: "PUR-2026-002",
      supplierId: "s2",
      date: new Date("2026-09-01"),
      paymentStatus: "PARTIAL" as PaymentStatus,
      notes: "50% deposit paid on order",
      items: [
        { productId: "p3", quantity: 10, unitPrice: 45000 },
        { productId: "p4", quantity: 20, unitPrice: 6000 },
      ],
    },
    {
      purchaseId: "pu3",
      purchaseNumber: "PUR-2026-003",
      supplierId: "s3",
      date: new Date("2026-09-05"),
      paymentStatus: "UNPAID" as PaymentStatus,
      notes: "Pending procurement approval",
      items: [{ productId: "p5", quantity: 10, unitPrice: 12000 }],
    },
  ];

  for (const pur of purchases) {
    const { items, ...purData } = pur;
    await prisma.purchase.upsert({
      where: { purchaseId: pur.purchaseId },
      update: purData,
      create: {
        ...purData,
        items: {
          create: items,
        },
      },
    });
  }
  console.log(`✅ Seeded ${purchases.length} purchase orders`);

  // 6. Seed Invoices & InvoiceItems
  const invoices = [
    {
      invoiceId: "inv1",
      invoiceNumber: "INV-2026-001",
      customerName: "Kigali Heights Apartments",
      date: new Date("2026-08-25"),
      dueDate: new Date("2026-09-08"),
      status: "PAID" as PaymentStatus,
      notes: "Block C plumbing contract",
      items: [{ description: "Plumbing installation — Block C", quantity: 1, unitPrice: 850000 }],
    },
    {
      invoiceId: "inv2",
      invoiceNumber: "INV-2026-002",
      customerName: "Norrsken House Kigali",
      date: new Date("2026-09-02"),
      dueDate: new Date("2026-09-16"),
      status: "PARTIAL" as PaymentStatus,
      notes: "40% deposit received",
      items: [
        { description: "Electrical wiring — 3rd floor", quantity: 1, unitPrice: 620000 },
        { description: "Circuit breaker panel upgrade", quantity: 2, unitPrice: 85000 },
      ],
    },
    {
      invoiceId: "inv3",
      invoiceNumber: "INV-2026-003",
      customerName: "Simba Supermarket - Kacyiru",
      date: new Date("2026-09-07"),
      dueDate: new Date("2026-09-21"),
      status: "UNPAID" as PaymentStatus,
      notes: "Hardware supply order",
      items: [{ productId: "p2", description: "Water Tap - Brass", quantity: 12, unitPrice: 11000 }],
    },
  ];

  for (const inv of invoices) {
    const { items, ...invData } = inv;
    await prisma.invoice.upsert({
      where: { invoiceId: inv.invoiceId },
      update: invData,
      create: {
        ...invData,
        items: {
          create: items,
        },
      },
    });
  }
  console.log(`✅ Seeded ${invoices.length} invoices`);

  // 7. Seed Expenses
  const expenses = [
    { expenseId: "e1", category: "SALARIES" as ExpenseCategory, description: "Staff salaries — August", amount: 1450000, date: new Date("2026-08-30"), paymentMethod: "BANK_TRANSFER" as PaymentMethod, responsiblePerson: "Claudine Mukashema" },
    { expenseId: "e2", category: "TRANSPORT" as ExpenseCategory, description: "Site visit fuel — Kacyiru & Remera jobs", amount: 85000, date: new Date("2026-09-03"), paymentMethod: "CASH" as PaymentMethod, responsiblePerson: "Emmanuel Bizimana" },
    { expenseId: "e3", category: "OPERATIONS" as ExpenseCategory, description: "Warehouse rent — September", amount: 350000, date: new Date("2026-09-01"), paymentMethod: "BANK_TRANSFER" as PaymentMethod, responsiblePerson: "Diane Umutoni" },
    { expenseId: "e4", category: "UTILITIES" as ExpenseCategory, description: "Electricity & water — office", amount: 62000, date: new Date("2026-09-05"), paymentMethod: "MOBILE_MONEY" as PaymentMethod, responsiblePerson: "Chantal Mukamana" },
    { expenseId: "e5", category: "OFFICE_EXPENSES" as ExpenseCategory, description: "Office & safety supplies", amount: 45000, date: new Date("2026-09-06"), paymentMethod: "CASH" as PaymentMethod, responsiblePerson: "Chantal Mukamana" },
  ];

  for (const exp of expenses) {
    await prisma.expense.upsert({
      where: { expenseId: exp.expenseId },
      update: exp,
      create: exp,
    });
  }
  console.log(`✅ Seeded ${expenses.length} expenses`);

  // 8. Seed Payments
  const payments = [
    { paymentId: "pay1", direction: "IN" as PaymentDirection, method: "BANK_TRANSFER" as PaymentMethod, amount: 850000, date: new Date("2026-08-26"), reference: "INV-2026-001" },
    { paymentId: "pay2", direction: "IN" as PaymentDirection, method: "MOBILE_MONEY" as PaymentMethod, amount: 316000, date: new Date("2026-09-02"), reference: "INV-2026-002" },
    { paymentId: "pay3", direction: "OUT" as PaymentDirection, method: "BANK_TRANSFER" as PaymentMethod, amount: 590000, date: new Date("2026-08-20"), reference: "PUR-2026-001" },
    { paymentId: "pay4", direction: "OUT" as PaymentDirection, method: "CASH" as PaymentMethod, amount: 285000, date: new Date("2026-09-02"), reference: "PUR-2026-002" },
  ];

  for (const pay of payments) {
    await prisma.payment.upsert({
      where: { paymentId: pay.paymentId },
      update: pay,
      create: pay,
    });
  }
  console.log(`✅ Seeded ${payments.length} payment records`);

  // 9. Seed Tasks
  const tasks = [
    {
      taskId: "tk1",
      title: "Plumbing installation — Block C",
      description: "Full plumbing installation for Block C, per signed scope.",
      status: "COMPLETED" as TaskStatus,
      priority: "HIGH" as TaskPriority,
      assigneeId: "u5",
      department: "Kigali Heights Apartments",
      startDate: new Date("2026-08-19"),
      dueDate: new Date("2026-08-24"),
      createdDate: new Date("2026-08-18"),
      invoiceId: "inv1",
    },
    {
      taskId: "tk2",
      title: "Electrical wiring — 3rd floor",
      description: "Wiring and circuit breaker panel upgrade.",
      status: "IN_PROGRESS" as TaskStatus,
      priority: "HIGH" as TaskPriority,
      assigneeId: "u6",
      department: "Norrsken House Kigali",
      startDate: new Date("2026-08-31"),
      dueDate: new Date("2026-09-14"),
      createdDate: new Date("2026-08-30"),
      invoiceId: "inv2",
    },
    {
      taskId: "tk3",
      title: "Water tap replacement (12 units)",
      description: "Replace 12 brass taps across store washrooms.",
      status: "COMPLETED" as TaskStatus,
      priority: "MEDIUM" as TaskPriority,
      assigneeId: "u5",
      department: "Simba Supermarket - Kacyiru",
      startDate: new Date("2026-09-04"),
      dueDate: new Date("2026-09-08"),
      createdDate: new Date("2026-09-03"),
      invoiceId: "inv3",
    },
    {
      taskId: "tk4",
      title: "Quarterly generator inspection — Warehouse",
      description: "Routine inspection and service of the backup generator.",
      status: "NOT_STARTED" as TaskStatus,
      priority: "MEDIUM" as TaskPriority,
      assigneeId: "u6",
      department: "Warehouse Generator Service",
      startDate: new Date("2026-08-29"),
      dueDate: new Date("2026-09-05"),
      createdDate: new Date("2026-08-28"),
    },
    {
      taskId: "tk5",
      title: "Repair leaking pipe — Kimironko site",
      description: "Client reported a leaking joint under kitchen sink.",
      status: "IN_PROGRESS" as TaskStatus,
      priority: "URGENT" as TaskPriority,
      assigneeId: "u5",
      department: "Kimironko Residence",
      startDate: new Date("2026-09-09"),
      dueDate: new Date("2026-09-11"),
      createdDate: new Date("2026-09-09"),
    },
    {
      taskId: "tk6",
      title: "Client site walkthrough — Remera project",
      description: "Initial site visit to scope upcoming installation.",
      status: "NOT_STARTED" as TaskStatus,
      priority: "LOW" as TaskPriority,
      assigneeId: "u6",
      department: "Remera Business Park",
      startDate: new Date("2026-09-10"),
      dueDate: new Date("2026-09-20"),
      createdDate: new Date("2026-09-10"),
    },
  ];

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { taskId: task.taskId },
      update: task,
      create: task,
    });
  }
  console.log(`✅ Seeded ${tasks.length} tasks`);

  // 10. Seed AlertItems
  const alerts = [
    { alertId: "a1", productId: "p4", kind: "OUT_OF_STOCK" as AlertKind, message: "Circuit Breaker 20A is completely out of stock!" },
    { alertId: "a2", productId: "p3", kind: "LOW_STOCK" as AlertKind, message: "Cable 2.5mm is below reorder threshold (6 rolls remaining)." },
    { alertId: "a3", productId: "p5", kind: "LOW_STOCK" as AlertKind, message: "Pipe Wrench 14\" is low in stock (9 pcs remaining)." },
    { alertId: "a4", productId: "p2", kind: "LOW_STOCK" as AlertKind, message: "Water Tap - Brass is low in stock (18 pcs remaining)." },
  ];

  for (const alt of alerts) {
    await prisma.alertItem.upsert({
      where: { alertId: alt.alertId },
      update: alt,
      create: alt,
    });
  }
  console.log(`✅ Seeded ${alerts.length} critical inventory alerts`);

  console.log("🎉 All operational seed data created successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
