import { Response } from "express";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../middlewares/auth.js";

// ---------------------------------------------------------------------------
// 1. ACCOUNTS & SUB-LEDGERS
// ---------------------------------------------------------------------------

export async function getAccounts(_req: AuthenticatedRequest, res: Response) {
  try {
    const accounts = await prisma.financeAccount.findMany({
      orderBy: { code: "asc" },
    });
    return res.json(accounts);
  } catch (error) {
    console.error("getAccounts error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, code, type, balance, currency, isSubLedger, accountNumber, bankName, description } = req.body;
    if (!name || !code || !type) {
      return res.status(400).json({ error: "Account name, code, and type are required" });
    }

    const newAcc = await prisma.financeAccount.create({
      data: {
        name,
        code,
        type,
        balance: Number(balance || 0),
        currency: currency || "RWF",
        isSubLedger: Boolean(isSubLedger),
        accountNumber,
        bankName,
        description,
      },
    });

    return res.status(201).json(newAcc);
  } catch (error) {
    console.error("createAccount error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 2. EXPENDITURE CODES
// ---------------------------------------------------------------------------

export async function getExpenditureCodes(_req: AuthenticatedRequest, res: Response) {
  try {
    const codes = await prisma.expenditureCode.findMany({
      orderBy: { code: "asc" },
    });
    return res.json(codes);
  } catch (error) {
    console.error("getExpenditureCodes error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createExpenditureCode(req: AuthenticatedRequest, res: Response) {
  try {
    const { code, name, category, description } = req.body;
    if (!code || !name || !category) {
      return res.status(400).json({ error: "Code, name, and category are required" });
    }

    const newCode = await prisma.expenditureCode.create({
      data: {
        code,
        name,
        category,
        description,
        isDefault: false,
      },
    });

    return res.status(201).json(newCode);
  } catch (error) {
    console.error("createExpenditureCode error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 3. TRANSACTIONS
// ---------------------------------------------------------------------------

export async function getTransactions(_req: AuthenticatedRequest, res: Response) {
  try {
    const transactions = await prisma.financeTransaction.findMany({
      orderBy: { date: "desc" },
    });
    return res.json(transactions);
  } catch (error) {
    console.error("getTransactions error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    const { date, description, type, sourceAccountId, destinationAccountId, amount, expenditureCodeId, reference, notes } = req.body;
    const numAmount = Number(amount);

    if (!description || !type || numAmount <= 0) {
      return res.status(400).json({ error: "Description, type, and positive amount are required" });
    }

    const newTx = await prisma.financeTransaction.create({
      data: {
        date: date || new Date().toISOString().slice(0, 10),
        description,
        type,
        sourceAccountId: sourceAccountId || "",
        destinationAccountId,
        amount: numAmount,
        expenditureCodeId,
        reference,
        notes,
      },
    });

    // Atomic Balance Adjustments
    if (type === "INTERNAL_TRANSFER" || type === "TRANSFER_IN") {
      if (sourceAccountId) {
        await prisma.financeAccount.updateMany({
          where: { id: sourceAccountId },
          data: { balance: { decrement: numAmount } },
        });
      }
      if (destinationAccountId) {
        await prisma.financeAccount.updateMany({
          where: { id: destinationAccountId },
          data: { balance: { increment: numAmount } },
        });
      }
    } else if (type === "CLIENT_PAID") {
      if (destinationAccountId) {
        await prisma.financeAccount.updateMany({
          where: { id: destinationAccountId },
          data: { balance: { increment: numAmount } },
        });
      }
      if (sourceAccountId) {
        await prisma.financeAccount.updateMany({
          where: { id: sourceAccountId },
          data: { balance: { decrement: numAmount } },
        });
      }
    } else {
      // OPEX, PURCHASE, RENT
      if (sourceAccountId) {
        await prisma.financeAccount.updateMany({
          where: { id: sourceAccountId },
          data: { balance: { decrement: numAmount } },
        });
      }
      if (destinationAccountId) {
        await prisma.financeAccount.updateMany({
          where: { id: destinationAccountId },
          data: { balance: { increment: numAmount } },
        });
      }
    }

    return res.status(201).json(newTx);
  } catch (error) {
    console.error("createTransaction error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 4. DEBTORS (Customers who owe KGST)
// ---------------------------------------------------------------------------

export async function getDebtors(_req: AuthenticatedRequest, res: Response) {
  try {
    const debtors = await prisma.debtor.findMany({
      include: { payments: true },
      orderBy: { date: "desc" },
    });
    return res.json(debtors);
  } catch (error) {
    console.error("getDebtors error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createDebtor(req: AuthenticatedRequest, res: Response) {
  try {
    const { date, customerName, item, phoneNumber, interestRate, capital, dueDate, notes } = req.body;
    const numCapital = Number(capital);
    const numRate = Number(interestRate || 0);

    // Business Logic: Total = Capital + Capital * Rate / 100
    const interest = (numCapital * numRate) / 100;
    const total = numCapital + interest;

    const newDebtor = await prisma.debtor.create({
      data: {
        date: date || new Date().toISOString().slice(0, 10),
        customerName,
        item,
        phoneNumber,
        interestRate: numRate,
        capital: numCapital,
        interest,
        total,
        dueDate,
        amountPaid: 0,
        status: "UNPAID",
        notes,
      },
      include: { payments: true },
    });

    return res.status(201).json(newDebtor);
  } catch (error) {
    console.error("createDebtor error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function recordDebtorPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const debtorId = req.params.debtorId as string;
    const { amount, accountId, reference } = req.body;
    const payAmount = Number(amount);

    const debtor = await prisma.debtor.findUnique({
      where: { id: debtorId },
      include: { payments: true },
    });

    if (!debtor) {
      return res.status(404).json({ error: "Debtor record not found" });
    }

    const newPaid = debtor.amountPaid + payAmount;
    let nextStatus = "UNPAID";
    if (newPaid >= debtor.total) {
      nextStatus = "PAID";
    } else if (newPaid > 0) {
      nextStatus = "PARTIAL";
    }

    // Record Payment Entry
    await prisma.debtorPaymentRecord.create({
      data: {
        debtorId,
        date: new Date().toISOString().slice(0, 10),
        amount: payAmount,
        accountId,
        reference,
      },
    });

    // Update Debtor Balance & Status
    const updatedDebtor = await prisma.debtor.update({
      where: { id: debtorId },
      data: {
        amountPaid: newPaid,
        status: nextStatus,
      },
      include: { payments: true },
    });

    // Increment Bank/Petty cash account balance
    await prisma.financeAccount.updateMany({
      where: { id: accountId },
      data: { balance: { increment: payAmount } },
    });

    // Create corresponding CLIENT_PAID Transaction
    await prisma.financeTransaction.create({
      data: {
        date: new Date().toISOString().slice(0, 10),
        description: `Debtor Payment Receipt — ${debtor.customerName}`,
        type: "CLIENT_PAID",
        sourceAccountId: "acc-006", // Pending Invoices
        destinationAccountId: accountId,
        amount: payAmount,
        reference: reference || `DEB-REC-${debtor.id.slice(-4)}`,
        notes: `Received payment for ${debtor.item}`,
      },
    });

    return res.json(updatedDebtor);
  } catch (error) {
    console.error("recordDebtorPayment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 5. CREDITORS (Suppliers KGST owes)
// ---------------------------------------------------------------------------

export async function getCreditors(_req: AuthenticatedRequest, res: Response) {
  try {
    const creditors = await prisma.creditor.findMany({
      include: { payments: true },
      orderBy: { date: "desc" },
    });
    return res.json(creditors);
  } catch (error) {
    console.error("getCreditors error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createCreditor(req: AuthenticatedRequest, res: Response) {
  try {
    const { date, supplierName, item, detail, amount, totalAmount, dueDate, notes } = req.body;

    const newCreditor = await prisma.creditor.create({
      data: {
        date: date || new Date().toISOString().slice(0, 10),
        supplierName,
        item,
        detail,
        amount: Number(amount),
        totalAmount: Number(totalAmount || amount),
        dueDate,
        amountPaid: 0,
        status: "UNPAID",
        notes,
      },
      include: { payments: true },
    });

    return res.status(201).json(newCreditor);
  } catch (error) {
    console.error("createCreditor error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function recordCreditorPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const creditorId = req.params.creditorId as string;
    const { amount, sourceAccountId, reference } = req.body;
    const payAmount = Number(amount);

    const creditor = await prisma.creditor.findUnique({
      where: { id: creditorId },
      include: { payments: true },
    });

    if (!creditor) {
      return res.status(404).json({ error: "Creditor record not found" });
    }

    const newPaid = creditor.amountPaid + payAmount;
    let nextStatus = "UNPAID";
    if (newPaid >= creditor.totalAmount) {
      nextStatus = "PAID";
    } else if (newPaid > 0) {
      nextStatus = "PARTIAL";
    }

    await prisma.creditorPaymentRecord.create({
      data: {
        creditorId,
        date: new Date().toISOString().slice(0, 10),
        amount: payAmount,
        accountId: sourceAccountId,
        reference,
      },
    });

    const updatedCreditor = await prisma.creditor.update({
      where: { id: creditorId },
      data: {
        amountPaid: newPaid,
        status: nextStatus,
      },
      include: { payments: true },
    });

    // Debit source bank account
    await prisma.financeAccount.updateMany({
      where: { id: sourceAccountId },
      data: { balance: { decrement: payAmount } },
    });

    // Create corresponding PURCHASE Transaction
    await prisma.financeTransaction.create({
      data: {
        date: new Date().toISOString().slice(0, 10),
        description: `Creditor Supplier Settlement — ${creditor.supplierName}`,
        type: "PURCHASE",
        sourceAccountId,
        amount: payAmount,
        reference: reference || `CRD-PAY-${creditor.id.slice(-4)}`,
        notes: `Settled payment for ${creditor.item}`,
      },
    });

    return res.json(updatedCreditor);
  } catch (error) {
    console.error("recordCreditorPayment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 6. FIXED ASSETS
// ---------------------------------------------------------------------------

export async function getFixedAssets(_req: AuthenticatedRequest, res: Response) {
  try {
    const assets = await prisma.fixedAsset.findMany({
      orderBy: { acquisitionDate: "desc" },
    });
    return res.json(assets);
  } catch (error) {
    console.error("getFixedAssets error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createFixedAsset(req: AuthenticatedRequest, res: Response) {
  try {
    const { code, assetName, category, acquisitionDate, purchaseValue, currentValuation, location, condition, notes } = req.body;

    const newAsset = await prisma.fixedAsset.create({
      data: {
        code,
        assetName,
        category,
        acquisitionDate: acquisitionDate || new Date().toISOString().slice(0, 10),
        purchaseValue: Number(purchaseValue),
        currentValuation: Number(currentValuation),
        location,
        condition,
        notes,
      },
    });

    // Sync Fixed Assets Register account balance
    const assets = await prisma.fixedAsset.findMany();
    const totalValuation = assets.reduce((sum, a) => sum + a.currentValuation, 0);
    await prisma.financeAccount.updateMany({
      where: { type: "FIXED_ASSETS" },
      data: { balance: totalValuation },
    });

    return res.status(201).json(newAsset);
  } catch (error) {
    console.error("createFixedAsset error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 7. REPORTS & ANALYTICS
// ---------------------------------------------------------------------------

export async function getIncomeStatement(req: AuthenticatedRequest, res: Response) {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const txs = await prisma.financeTransaction.findMany();
    const expCodes = await prisma.expenditureCode.findMany();
    const codeMap = new Map(expCodes.map((c) => [c.id, c.name]));

    const filtered = txs.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });

    let totalRevenue = 0;
    const revenueBySource: Record<string, number> = {};
    let totalExpenses = 0;
    const expensesByCode: Record<string, number> = {};

    for (const t of filtered) {
      if (t.type === "CLIENT_PAID" || t.type === "TRANSFER_IN") {
        totalRevenue += t.amount;
        const sourceLabel = t.description.slice(0, 30) || "Direct Revenue";
        revenueBySource[sourceLabel] = (revenueBySource[sourceLabel] || 0) + t.amount;
      } else if (t.type === "OPEX" || t.type === "PURCHASE" || t.type === "RENT") {
        totalExpenses += t.amount;
        const codeName = (t.expenditureCodeId && codeMap.get(t.expenditureCodeId)) || "General Expenses";
        expensesByCode[codeName] = (expensesByCode[codeName] || 0) + t.amount;
      }
    }

    return res.json({
      periodLabel: startDate && endDate ? `${startDate} to ${endDate}` : "All Recorded Periods",
      totalRevenue,
      revenueBySource,
      totalExpenses,
      expensesByCode,
      netIncome: totalRevenue - totalExpenses,
    });
  } catch (error) {
    console.error("getIncomeStatement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getBalanceSheet(req: AuthenticatedRequest, res: Response) {
  try {
    const asOfDate = (req.query.asOfDate as string) || new Date().toISOString().slice(0, 10);
    const accounts = await prisma.financeAccount.findMany();
    const debtors = await prisma.debtor.findMany();
    const creditors = await prisma.creditor.findMany();
    const fixedAssets = await prisma.fixedAsset.findMany();

    let cashAndBank = 0;
    let pendingInvoices = 0;
    let subLedgerBalances = 0;
    let capitalAccount = 0;
    let loanAccount = 0;

    for (const acc of accounts) {
      if (acc.isSubLedger) {
        subLedgerBalances += acc.balance;
      } else if (["BANK_PRIMARY", "BANK_SUB", "PETTY_CASH", "EQUITY_BANK", "EQUITY_SUB", "SAVINGS_ACCOUNT"].includes(acc.type)) {
        cashAndBank += acc.balance;
      } else if (acc.type === "PENDING_INVOICES") {
        pendingInvoices += acc.balance;
      } else if (acc.type === "CAPITAL_ACCOUNT") {
        capitalAccount += acc.balance;
      } else if (acc.type === "LOAN_ACCOUNT") {
        loanAccount += acc.balance;
      }
    }

    const debtorsReceivable = debtors
      .filter((d) => d.status !== "PAID")
      .reduce((sum, d) => sum + (d.total - d.amountPaid), 0);

    const totalCurrentAssets = cashAndBank + debtorsReceivable + pendingInvoices + subLedgerBalances;
    const totalFixedAssetsValuation = fixedAssets.reduce((sum, a) => sum + a.currentValuation, 0);

    const creditorsPayable = creditors
      .filter((c) => c.status !== "PAID")
      .reduce((sum, c) => sum + (c.totalAmount - c.amountPaid), 0);

    const totalLiabilities = creditorsPayable + loanAccount;

    const txs = await prisma.financeTransaction.findMany();
    const totalRev = txs.filter((t) => t.type === "CLIENT_PAID" || t.type === "TRANSFER_IN").reduce((s, t) => s + t.amount, 0);
    const totalExp = txs.filter((t) => t.type === "OPEX" || t.type === "PURCHASE" || t.type === "RENT").reduce((s, t) => s + t.amount, 0);
    const retainedEarnings = totalRev - totalExp;

    const totalEquity = capitalAccount + retainedEarnings;
    const totalAssets = totalCurrentAssets + totalFixedAssetsValuation;

    return res.json({
      asOfDate,
      currentAssets: {
        cashAndBank,
        debtorsReceivable,
        pendingInvoices,
        subLedgerBalances,
        totalCurrentAssets,
      },
      nonCurrentAssets: {
        fixedAssets: totalFixedAssetsValuation,
        totalNonCurrentAssets: totalFixedAssetsValuation,
      },
      totalAssets,
      currentLiabilities: {
        creditorsPayable,
        loanAccount,
        totalLiabilities,
      },
      equity: {
        capitalAccount,
        retainedEarnings,
        totalEquity,
      },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    });
  } catch (error) {
    console.error("getBalanceSheet error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTrendData(_req: AuthenticatedRequest, res: Response) {
  try {
    const txs = await prisma.financeTransaction.findMany();
    const monthsMap: Record<string, { revenue: number; expenses: number }> = {};

    for (const t of txs) {
      const month = t.date.slice(0, 7);
      if (!monthsMap[month]) {
        monthsMap[month] = { revenue: 0, expenses: 0 };
      }
      if (t.type === "CLIENT_PAID" || t.type === "TRANSFER_IN") {
        monthsMap[month].revenue += t.amount;
      } else if (t.type === "OPEX" || t.type === "PURCHASE" || t.type === "RENT") {
        monthsMap[month].expenses += t.amount;
      }
    }

    const points = Object.entries(monthsMap)
      .sort(([m1], [m2]) => m1.localeCompare(m2))
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        netProfit: data.revenue - data.expenses,
      }));

    return res.json(points);
  } catch (error) {
    console.error("getTrendData error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
