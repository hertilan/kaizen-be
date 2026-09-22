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

  // 11. Seed Finance Accounts
  const financeAccounts = [
    { id: "acc-001", name: "Bank Account (Primary)", code: "BK-001", type: "BANK_PRIMARY", balance: 48500000, currency: "RWF", isSubLedger: false, bankName: "Bank of Kigali", accountNumber: "00040-0692134-92" },
    { id: "acc-002", name: "Bank Sub-Account", code: "BK-SUB", type: "BANK_SUB", balance: 14200000, currency: "RWF", isSubLedger: false, bankName: "Bank of Kigali", accountNumber: "00040-0692134-93" },
    { id: "acc-003", name: "Petty Cash", code: "PC-001", type: "PETTY_CASH", balance: 1850000, currency: "RWF", isSubLedger: false, description: "Kigali Head Office Petty Cash Safe" },
    { id: "acc-004", name: "Equity Bank Account", code: "EQ-001", type: "EQUITY_BANK", balance: 22400000, currency: "RWF", isSubLedger: false, bankName: "Equity Bank Rwanda", accountNumber: "400211094821" },
    { id: "acc-005", name: "Equity Sub-Account", code: "EQ-SUB", type: "EQUITY_SUB", balance: 6800000, currency: "RWF", isSubLedger: false, bankName: "Equity Bank Rwanda", accountNumber: "400211094822" },
    { id: "acc-006", name: "Pending Invoices", code: "INV-ACC", type: "PENDING_INVOICES", balance: 18900000, currency: "RWF", isSubLedger: false, description: "Uncollected client invoices ledger" },
    { id: "acc-007", name: "Fixed Assets Register", code: "AST-REG", type: "FIXED_ASSETS", balance: 75000000, currency: "RWF", isSubLedger: false, description: "Tracked machinery, vehicles & property register" },
    { id: "acc-008", name: "Capital Account", code: "CAP-001", type: "CAPITAL_ACCOUNT", balance: 85000000, currency: "RWF", isSubLedger: false, description: "Shareholder Paid-in Capital" },
    { id: "acc-009", name: "Savings Account", code: "SAV-001", type: "SAVINGS_ACCOUNT", balance: 12500000, currency: "RWF", isSubLedger: false, bankName: "I&M Bank Rwanda", accountNumber: "20084920194" },
    { id: "acc-010", name: "Loan Account", code: "LON-001", type: "LOAN_ACCOUNT", balance: 15000000, currency: "RWF", isSubLedger: false, description: "BRD Equipment Expansion Loan" },
    { id: "acc-101", name: "Quincaillerie (Retail Ledger)", code: "SUB-QUI", type: "QUINCAILLERIE", balance: 16400000, currency: "RWF", isSubLedger: true, description: "Retail Hardware Shop operations & cash flow" },
    { id: "acc-102", name: "Wholesaler (Wholesale Ledger)", code: "SUB-WHO", type: "WHOLESALER", balance: 34100000, currency: "RWF", isSubLedger: true, description: "Bulk building material distribution ledger" },
    { id: "acc-103", name: "Transport Service Ledger", code: "SUB-TRS", type: "TRANSPORT_SERVICE", balance: 9300000, currency: "RWF", isSubLedger: true, description: "Logistics fleet revenue & maintenance ledger" },
  ];

  for (const acc of financeAccounts) {
    await prisma.financeAccount.upsert({
      where: { id: acc.id },
      update: acc,
      create: acc,
    });
  }
  console.log(`✅ Seeded ${financeAccounts.length} finance accounts`);

  // 12. Seed Expenditure Codes
  const expenditureCodes = [
    { id: "exp-001", code: "EXP-QUI", name: "Quincaillerie", category: "MATERIALS", isDefault: true, description: "Quincaillerie material inventory & operations" },
    { id: "exp-002", code: "EXP-WHO", name: "Wholesale", category: "MATERIALS", isDefault: true, description: "Wholesale distribution stock purchases" },
    { id: "exp-003", code: "EXP-TRS", name: "Transport Service", category: "LOGISTICS", isDefault: true, description: "Heavy vehicle & freight transport services" },
    { id: "exp-004", code: "EXP-WAG", name: "Wages", category: "SALARIES", isDefault: true, description: "Site worker payroll and daily wages" },
    { id: "exp-005", code: "EXP-CHG", name: "Charges", category: "OPERATIONAL", isDefault: true, description: "Bank processing fees and duty charges" },
    { id: "exp-006", code: "EXP-PUM", name: "Purchase material (own use on site)", category: "MATERIALS", isDefault: true, description: "Construction raw materials for active engineering sites" },
    { id: "exp-007", code: "EXP-TRN", name: "Transportation", category: "LOGISTICS", isDefault: true, description: "Fuel and local transport logistics" },
    { id: "exp-008", code: "EXP-LNC", name: "Lunch", category: "OPERATIONAL", isDefault: true, description: "Site crew & staff daily subsistence allowance" },
    { id: "exp-009", code: "EXP-AIR", name: "Airtime", category: "ADMINISTRATIVE", isDefault: true, description: "Staff communication & internet data allowance" },
    { id: "exp-010", code: "EXP-RNT-M", name: "Renting materials", category: "SERVICES", isDefault: true, description: "Scaffolding, generators & heavy equipment lease" },
    { id: "exp-011", code: "EXP-GUS", name: "Gushaka amasoko", category: "SERVICES", isDefault: true, description: "Market research & client procurement outreach" },
    { id: "exp-012", code: "EXP-SUP", name: "Supply materials", category: "MATERIALS", isDefault: true, description: "Client project supply procurement" },
    { id: "exp-013", code: "EXP-RNT", name: "Rent", category: "OPERATIONAL", isDefault: true, description: "Office & yard facility rental" },
    { id: "exp-014", code: "EXP-GEN", name: "General expenses", category: "OPERATIONAL", isDefault: true, description: "Miscellaneous operational expenses" },
    { id: "exp-015", code: "EXP-TRF", name: "Transfer", category: "OPERATIONAL", isDefault: true, description: "Inter-account liquidity rebalancing" },
    { id: "exp-016", code: "EXP-ADM", name: "Administrative expenses", category: "ADMINISTRATIVE", isDefault: true, description: "Office supplies, licenses & compliance fees" },
    { id: "exp-017", code: "EXP-PQU", name: "Purchase Quincaillerie", category: "MATERIALS", isDefault: true, description: "Retail store inventory replenishment" },
    { id: "exp-018", code: "EXP-PWH", name: "Purchase Wholesaler", category: "MATERIALS", isDefault: true, description: "Bulk distributor inventory procurement" },
  ];

  for (const exp of expenditureCodes) {
    await prisma.expenditureCode.upsert({
      where: { id: exp.id },
      update: exp,
      create: exp,
    });
  }
  console.log(`✅ Seeded ${expenditureCodes.length} expenditure codes`);

  // 13. Seed Debtors
  const debtors = [
    {
      id: "deb-001",
      date: "2026-09-02",
      customerName: "Real Contractors Rwanda Ltd",
      item: "High-grade Steel Rebars (25 Tons) & Formwork",
      phoneNumber: "+250 788 412 903",
      interestRate: 4,
      capital: 12500000,
      interest: 500000,
      total: 13000000,
      dueDate: "2026-09-25",
      amountPaid: 3000000,
      status: "PARTIAL",
      notes: "Bugesera Residential Site order. Partial payment of 3M RWF received.",
    },
    {
      id: "deb-002",
      date: "2026-08-20",
      customerName: "Kigali Eco-Lodges & Resorts",
      item: "Electrical Fitting & Plumbing Installation Materials",
      phoneNumber: "+250 783 910 220",
      interestRate: 5,
      capital: 6800000,
      interest: 340000,
      total: 7140000,
      dueDate: "2026-09-22",
      amountPaid: 0,
      status: "UNPAID",
      notes: "Nyamata luxury lodge construction phase 2.",
    },
    {
      id: "deb-003",
      date: "2026-08-01",
      customerName: "Inyange Engineering Partners",
      item: "Quincaillerie Heavy Machinery Rental & Paving Blocks",
      phoneNumber: "+250 788 554 119",
      interestRate: 3,
      capital: 4500000,
      interest: 135000,
      total: 4635000,
      dueDate: "2026-09-05",
      amountPaid: 0,
      status: "UNPAID",
      notes: "Overdue payment notice issued via WhatsApp & email.",
    },
  ];

  for (const deb of debtors) {
    await prisma.debtor.upsert({
      where: { id: deb.id },
      update: deb,
      create: deb,
    });
  }
  console.log(`✅ Seeded ${debtors.length} debtors`);

  // 14. Seed Creditors
  const creditors = [
    {
      id: "crd-001",
      date: "2026-09-05",
      supplierName: "CIMERWA PLC",
      item: "Bulk Portland Cement Delivery",
      detail: "Invoice #CIM-2026-8812 covering 60 Tons Cement for Wholesaler Yard",
      amount: 14800000,
      totalAmount: 14800000,
      dueDate: "2026-09-24",
      amountPaid: 5000000,
      status: "PARTIAL",
      notes: "30-day credit agreement terms.",
    },
    {
      id: "crd-002",
      date: "2026-08-25",
      supplierName: "Rwanda Steel Products Ltd",
      item: "Deformed Bar Steel & Roofing Sheets",
      detail: "Supply contract RSP-KGST-991 for Quincaillerie stock",
      amount: 9200000,
      totalAmount: 9200000,
      dueDate: "2026-09-20",
      amountPaid: 0,
      status: "UNPAID",
      notes: "Payment due via Equity Bank account transfer.",
    },
  ];

  for (const crd of creditors) {
    await prisma.creditor.upsert({
      where: { id: crd.id },
      update: crd,
      create: crd,
    });
  }
  console.log(`✅ Seeded ${creditors.length} creditors`);

  // 15. Seed Fixed Assets
  const fixedAssets = [
    {
      id: "ast-001",
      code: "AST-TRK-01",
      assetName: "SinoTipper 25-Ton Dump Truck",
      category: "LOGISTICS_VEHICLES",
      acquisitionDate: "2024-03-15",
      purchaseValue: 38000000,
      currentValuation: 32000000,
      location: "Gikondo Transport Fleet Yard",
      condition: "EXCELLENT",
      notes: "Primary heavy transport vehicle for wholesale aggregate delivery",
    },
    {
      id: "ast-002",
      code: "AST-EXC-01",
      assetName: "JCB 3CX Backhoe Loader Excavator",
      category: "HEAVY_MACHINERY",
      acquisitionDate: "2023-11-10",
      purchaseValue: 45000000,
      currentValuation: 38500000,
      location: "Kigali Civil Engineering Sites",
      condition: "GOOD",
      notes: "Leased out for site earthworks & active construction projects",
    },
  ];

  for (const ast of fixedAssets) {
    await prisma.fixedAsset.upsert({
      where: { id: ast.id },
      update: ast,
      create: ast,
    });
  }
  console.log(`✅ Seeded ${fixedAssets.length} fixed assets`);

  // 16. Seed Finance Transactions
  const financeTransactions = [
    {
      id: "tx-1001",
      date: "2026-09-18",
      description: "Kigali Heights Commercial Renovation — Initial Milestone Payment",
      type: "CLIENT_PAID",
      sourceAccountId: "acc-006",
      destinationAccountId: "acc-001",
      amount: 14500000,
      reference: "REC-2026-091",
      notes: "Direct bank transfer received via Bank of Kigali",
    },
    {
      id: "tx-1002",
      date: "2026-09-17",
      description: "CIMERWA Cement Procurement for Wholesale Yard",
      type: "PURCHASE",
      sourceAccountId: "acc-001",
      destinationAccountId: "acc-102",
      amount: 8200000,
      expenditureCodeId: "exp-018",
      reference: "PO-KGST-482",
      notes: "40 Tons Cement delivery to Gikondo warehouse",
    },
    {
      id: "tx-1003",
      date: "2026-09-16",
      description: "Site Engineering Staff Mid-Month Wages",
      type: "OPEX",
      sourceAccountId: "acc-001",
      amount: 3400000,
      expenditureCodeId: "exp-004",
      reference: "PAY-2026-09A",
      notes: "Covering 18 civil engineers & technologist team",
    },
    {
      id: "tx-1004",
      date: "2026-09-15",
      description: "Petty Cash Liquidity Top-up",
      type: "INTERNAL_TRANSFER",
      sourceAccountId: "acc-001",
      destinationAccountId: "acc-003",
      amount: 1000000,
      expenditureCodeId: "exp-015",
      reference: "TRF-PC-049",
      notes: "Cash withdrawal for Kigali Head Office daily disbursements",
    },
    {
      id: "tx-1005",
      date: "2026-09-14",
      description: "Quincaillerie Store Retail Sales Deposit",
      type: "TRANSFER_IN",
      sourceAccountId: "acc-101",
      destinationAccountId: "acc-004",
      amount: 4650000,
      expenditureCodeId: "exp-001",
      reference: "DEP-QUI-912",
      notes: "Weekly counter cash receipts deposited into Equity Bank",
    },
  ];

  for (const tx of financeTransactions) {
    await prisma.financeTransaction.upsert({
      where: { id: tx.id },
      update: tx,
      create: tx,
    });
  }
  console.log(`✅ Seeded ${financeTransactions.length} finance transactions`);

  // 17. Seed SD Shops
  const sdShops = [
    { id: "shop-gikondo", name: "Gikondo Quincaillerie Shop", type: "RETAIL", sellerName: "Jean-Paul Habimana", location: "Gikondo Commercial Complex" },
    { id: "shop-nyabugogo", name: "Nyabugogo Retail Branch", type: "RETAIL", sellerName: "Marie-Claire Uwase", location: "Nyabugogo Hardware Terminal" },
    { id: "shop-kimironko", name: "Kimironko Hardware Store", type: "RETAIL", sellerName: "Emmanuel Nkurunziza", location: "Kimironko Market Zone" },
    { id: "shop-wholesale-hub", name: "Wholesale Distribution Hub", type: "WHOLESALE", sellerName: "Eric Maniraguha", location: "Gikondo Industrial Yard" },
  ];
  for (const s of sdShops) {
    await prisma.sDShop.upsert({ where: { id: s.id }, update: s, create: s });
  }
  console.log(`✅ Seeded ${sdShops.length} SD shops`);

  // 18. Seed SD Categories
  const sdCategories = [
    { id: "cat-plumbing", code: "CAT-PLM", name: "Plumbing", description: "PPR, PVC, GI pipes, valves & pressure fittings" },
    { id: "cat-electrical", code: "CAT-ELE", name: "Electrical", description: "Breakers, LED bulbs, wiring, switches & conduit" },
    { id: "cat-construction", code: "CAT-CNS", name: "Construction Materials", description: "Cement, steel rebars, paving blocks & aggregate" },
    { id: "cat-paint", code: "CAT-PNT", name: "Paint", description: "Interior emulsion, weatherguard & primer coats" },
    { id: "cat-tools", code: "CAT-HTL", name: "Hand Tools", description: "Trowels, spirit levels, hammers, saws & measuring tapes" },
    { id: "cat-sanitary", code: "CAT-SAN", name: "Sanitary", description: "WC suites, wash basins, mixer taps & shower sets" },
  ];
  for (const c of sdCategories) {
    await prisma.sDCategory.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log(`✅ Seeded ${sdCategories.length} SD categories`);

  // 19. Seed SD Attribute Templates
  const sdTemplates = [
    {
      id: "tpl-cat-plumbing",
      categoryId: "cat-plumbing",
      categoryName: "Plumbing",
      fields: [
        { key: "material", label: "Material", type: "DROPDOWN", options: ["PVC", "PPR", "GI"], required: true },
        { key: "diameter", label: "Diameter / Size", type: "DROPDOWN", options: ["1/2\"", "3/4\"", "1\"", "63mm", "90mm", "110mm"], required: true },
        { key: "fittingType", label: "Fitting Type", type: "DROPDOWN", options: ["pipe", "elbow", "tee", "valve", "glue", "adapter"], required: true },
        { key: "pressureClass", label: "Pressure Class", type: "TEXT", required: false },
        { key: "brand", label: "Brand / Manufacturer", type: "TEXT", required: false },
      ],
    },
    {
      id: "tpl-cat-electrical",
      categoryId: "cat-electrical",
      categoryName: "Electrical",
      fields: [
        { key: "brand", label: "Brand", type: "TEXT", required: true },
        { key: "wattage", label: "Wattage (W)", type: "NUMBER", required: true, unitLabel: "W" },
        { key: "voltage", label: "Voltage (V)", type: "NUMBER", required: false, unitLabel: "V" },
        { key: "bulbType", label: "Bulb / Fixture Type", type: "DROPDOWN", options: ["LED", "incandescent", "CFL", "tube"], required: true },
        { key: "fittingType", label: "Base / Fitting Type", type: "TEXT", required: false },
        { key: "indoorOutdoor", label: "Environment Rating", type: "DROPDOWN", options: ["Indoor", "Outdoor", "Submersible"], required: false },
      ],
    },
    {
      id: "tpl-cat-construction",
      categoryId: "cat-construction",
      categoryName: "Construction Materials",
      fields: [
        { key: "brand", label: "Brand", type: "TEXT", required: false },
        { key: "unit", label: "Standard Unit", type: "TEXT", required: true },
        { key: "size", label: "Dimensions / Grade", type: "TEXT", required: false },
      ],
    },
    {
      id: "tpl-cat-paint",
      categoryId: "cat-paint",
      categoryName: "Paint",
      fields: [
        { key: "brand", label: "Brand", type: "TEXT", required: true },
        { key: "finish", label: "Finish Type", type: "DROPDOWN", options: ["Matte", "Gloss", "Silk", "Primer"], required: false },
        { key: "color", label: "Color Name / Code", type: "TEXT", required: true },
        { key: "bucketSize", label: "Bucket Volume (Liters)", type: "NUMBER", required: true, unitLabel: "L" },
      ],
    },
    {
      id: "tpl-cat-tools",
      categoryId: "cat-tools",
      categoryName: "Hand Tools",
      fields: [
        { key: "brand", label: "Brand", type: "TEXT", required: false },
        { key: "toolType", label: "Tool Classification", type: "TEXT", required: true },
        { key: "size", label: "Specification / Size", type: "TEXT", required: false },
      ],
    },
    {
      id: "tpl-cat-sanitary",
      categoryId: "cat-sanitary",
      categoryName: "Sanitary",
      fields: [
        { key: "brand", label: "Brand", type: "TEXT", required: false },
        { key: "material", label: "Sanitaryware Material", type: "TEXT", required: false },
        { key: "color", label: "Finish / Color", type: "TEXT", required: false },
      ],
    },
  ];
  for (const t of sdTemplates) {
    await prisma.sDAttributeTemplate.upsert({ where: { id: t.id }, update: t, create: t });
  }
  console.log(`✅ Seeded ${sdTemplates.length} SD attribute templates`);

  // 20. Seed SD Products
  const sdProducts = [
    {
      id: "prod-plm-001",
      code: "PPR-34P-PN20",
      name: "PPR Pipe 3/4 inch PN20 (4-Meter)",
      categoryId: "cat-plumbing",
      categoryName: "Plumbing",
      attributeValues: { material: "PPR", diameter: "3/4\"", fittingType: "pipe", pressureClass: "PN20", brand: "Polytank Rwanda" },
      unit: "Pcs",
      purchasePrice: 4200,
      sellingPrice: 6500,
      shopId: "shop-gikondo",
    },
    {
      id: "prod-plm-002",
      code: "PPR-1P-PN20",
      name: "PPR Pipe 1 inch PN20 (4-Meter)",
      categoryId: "cat-plumbing",
      categoryName: "Plumbing",
      attributeValues: { material: "PPR", diameter: "1\"", fittingType: "pipe", pressureClass: "PN20", brand: "Polytank Rwanda" },
      unit: "Pcs",
      purchasePrice: 6800,
      sellingPrice: 9800,
      shopId: "shop-gikondo",
    },
    {
      id: "prod-plm-003",
      code: "PVC-90E-CLB",
      name: "PVC Pressure Elbow 90mm Class B",
      categoryId: "cat-plumbing",
      categoryName: "Plumbing",
      attributeValues: { material: "PVC", diameter: "90mm", fittingType: "elbow", pressureClass: "Class B", brand: "Kigali Plastics" },
      unit: "Pcs",
      purchasePrice: 1800,
      sellingPrice: 2800,
      shopId: "shop-gikondo",
    },
    {
      id: "prod-plm-004",
      code: "PVC-110P-CLA",
      name: "PVC Waste Pipe 110mm Class A (6-Meter)",
      categoryId: "cat-plumbing",
      categoryName: "Plumbing",
      attributeValues: { material: "PVC", diameter: "110mm", fittingType: "pipe", pressureClass: "Class A", brand: "Kigali Plastics" },
      unit: "Pcs",
      purchasePrice: 12500,
      sellingPrice: 17500,
      shopId: "shop-wholesale-hub",
    },
    {
      id: "prod-ele-001",
      code: "LED-9W-E27",
      name: "Philips LED Bulb 9W E27 Daylight",
      categoryId: "cat-electrical",
      categoryName: "Electrical",
      attributeValues: { brand: "Philips", wattage: 9, voltage: 220, bulbType: "LED", fittingType: "E27 Screw", indoorOutdoor: "Indoor" },
      unit: "Pcs",
      purchasePrice: 1600,
      sellingPrice: 2500,
      shopId: "shop-gikondo",
    },
    {
      id: "prod-ele-002",
      code: "LED-25W-FL",
      name: "Osram Heavy Floodlight 25W Outdoor IP65",
      categoryId: "cat-electrical",
      categoryName: "Electrical",
      attributeValues: { brand: "Osram", wattage: 25, voltage: 240, bulbType: "LED", fittingType: "Bracket Mount", indoorOutdoor: "Outdoor" },
      unit: "Pcs",
      purchasePrice: 14000,
      sellingPrice: 21000,
      shopId: "shop-nyabugogo",
    },
    {
      id: "prod-cns-001",
      code: "CIM-325-50K",
      name: "CIMERWA 32.5N Cement 50kg Bag",
      categoryId: "cat-construction",
      categoryName: "Construction Materials",
      attributeValues: { brand: "CIMERWA PLC", unit: "Bag 50kg", size: "32.5N Grade" },
      unit: "Bag",
      purchasePrice: 9800,
      sellingPrice: 11500,
      shopId: "shop-wholesale-hub",
    },
  ];
  for (const p of sdProducts) {
    await prisma.sDProduct.upsert({ where: { id: p.id }, update: p, create: p });
  }
  console.log(`✅ Seeded ${sdProducts.length} SD products`);

  // 21. Seed SD Purchases
  const sdPurchases = [
    {
      id: "pur-sd-001",
      purchaseNumber: "RESTOCK-001",
      date: "2026-09-02",
      shopId: "shop-gikondo",
      supplierName: "Polytank Rwanda Distribution",
      totalQuantity: 180,
      totalAmount: 964000,
      notes: "Initial inventory batch delivery for Gikondo shop",
      items: [
        { productId: "prod-plm-001", productName: "PPR Pipe 3/4 inch PN20 (4-Meter)", quantity: 100, unitPrice: 4200, total: 420000 },
        { productId: "prod-plm-002", productName: "PPR Pipe 1 inch PN20 (4-Meter)", quantity: 80, unitPrice: 6800, total: 544000 },
      ],
    },
    {
      id: "pur-sd-003",
      purchaseNumber: "RESTOCK-003",
      date: "2026-09-04",
      shopId: "shop-gikondo",
      supplierName: "Kigali Plastics Industry",
      totalQuantity: 270,
      totalAmount: 462000,
      items: [
        { productId: "prod-plm-003", productName: "PVC Pressure Elbow 90mm Class B", quantity: 150, unitPrice: 1800, total: 270000 },
        { productId: "prod-ele-001", productName: "Philips LED Bulb 9W E27 Daylight", quantity: 120, unitPrice: 1600, total: 192000 },
      ],
    },
    {
      id: "pur-sd-005",
      purchaseNumber: "RESTOCK-005",
      date: "2026-09-06",
      shopId: "shop-wholesale-hub",
      supplierName: "CIMERWA PLC",
      totalQuantity: 500,
      totalAmount: 4900000,
      items: [
        { productId: "prod-cns-001", productName: "CIMERWA 32.5N Cement 50kg Bag", quantity: 500, unitPrice: 9800, total: 4900000 },
      ],
    },
  ];
  for (const pur of sdPurchases) {
    const { items, ...purData } = pur;
    await prisma.sDPurchase.upsert({
      where: { id: pur.id },
      update: purData,
      create: {
        ...purData,
        items: { create: items },
      },
    });
  }
  console.log(`✅ Seeded ${sdPurchases.length} SD purchases`);

  // 22. Seed SD Clients
  const sdClients = [
    {
      id: "cli-001",
      name: "Nyabugogo Plumbing Services",
      phone: "+250 788 610 204",
      email: "info@nyabugogoplumbing.rw",
      address: "Nyabugogo Commercial Zone",
      channel: "RETAIL",
      shopId: "shop-gikondo",
      totalPurchased: 162500,
      amountOwed: 0,
    },
    {
      id: "cli-002",
      name: "Kanombe Commercial Builders Ltd",
      phone: "+250 783 119 402",
      email: "procurement@kanombebuilders.rw",
      address: "Kanombe Site Office",
      channel: "WHOLESALE",
      shopId: "shop-wholesale-hub",
      totalPurchased: 2300000,
      amountOwed: 800000,
    },
    {
      id: "cli-003",
      name: "Gisenyi Water Technologists",
      phone: "+250 788 301 992",
      email: "tech@gisenyiwater.rw",
      address: "Rubavu Highway Depot",
      channel: "RETAIL",
      shopId: "shop-gikondo",
      totalPurchased: 112000,
      amountOwed: 0,
    },
  ];
  for (const c of sdClients) {
    await prisma.sDClient.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log(`✅ Seeded ${sdClients.length} SD clients`);

  // 23. Seed SD Sales
  const sdSales = [
    {
      id: "sale-sd-001",
      saleNumber: "INV-2026-101",
      date: "2026-09-10",
      clientId: "cli-001",
      clientName: "Nyabugogo Plumbing Services",
      channel: "RETAIL",
      shopId: "shop-gikondo",
      totalQuantity: 35,
      totalAmount: 190500,
      totalCost: 123000,
      profitMargin: 67500,
      amountPaid: 190500,
      amountOwed: 0,
      notes: "Counter sale paid via MTN Mobile Money",
      items: [
        { productId: "prod-plm-001", productName: "PPR Pipe 3/4 inch PN20 (4-Meter)", quantity: 25, unitPrice: 6500, unitCost: 4200, total: 162500, profitMargin: 57500 },
        { productId: "prod-plm-003", productName: "PVC Pressure Elbow 90mm Class B", quantity: 10, unitPrice: 2800, unitCost: 1800, total: 28000, profitMargin: 10000 },
      ],
    },
    {
      id: "sale-sd-002",
      saleNumber: "INV-2026-201",
      date: "2026-09-14",
      clientId: "cli-002",
      clientName: "Kanombe Commercial Builders Ltd",
      channel: "WHOLESALE",
      shopId: "shop-wholesale-hub",
      totalQuantity: 200,
      totalAmount: 2300000,
      totalCost: 1960000,
      profitMargin: 340000,
      amountPaid: 1500000,
      amountOwed: 800000,
      financeDebtorId: "deb-002",
      notes: "Bulk cement purchase — RWF 800,000 balance deferred 14 days",
      items: [
        { productId: "prod-cns-001", productName: "CIMERWA 32.5N Cement 50kg Bag", quantity: 200, unitPrice: 11500, unitCost: 9800, total: 2300000, profitMargin: 340000 },
      ],
    },
  ];
  for (const s of sdSales) {
    const { items, ...saleData } = s;
    await prisma.sDSale.upsert({
      where: { id: s.id },
      update: saleData,
      create: {
        ...saleData,
        items: { create: items },
      },
    });
  }
  console.log(`✅ Seeded ${sdSales.length} SD sales`);

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
