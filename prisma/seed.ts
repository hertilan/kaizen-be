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
