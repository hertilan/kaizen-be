import { Router } from "express";
import {
  getAccounts,
  createAccount,
  getExpenditureCodes,
  createExpenditureCode,
  getTransactions,
  createTransaction,
  getDebtors,
  createDebtor,
  recordDebtorPayment,
  getCreditors,
  createCreditor,
  recordCreditorPayment,
  getFixedAssets,
  createFixedAsset,
  getIncomeStatement,
  getBalanceSheet,
  getTrendData,
} from "../controllers/financeController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Protect all finance endpoints with authentication
router.use(authenticate);

// Accounts
router.get("/accounts", getAccounts);
router.post("/accounts", createAccount);

// Expenditure Codes
router.get("/expenditure-codes", getExpenditureCodes);
router.post("/expenditure-codes", createExpenditureCode);

// Transactions
router.get("/transactions", getTransactions);
router.post("/transactions", createTransaction);

// Debtors
router.get("/debtors", getDebtors);
router.post("/debtors", createDebtor);
router.post("/debtors/:debtorId/payments", recordDebtorPayment);

// Creditors
router.get("/creditors", getCreditors);
router.post("/creditors", createCreditor);
router.post("/creditors/:creditorId/payments", recordCreditorPayment);

// Fixed Assets
router.get("/fixed-assets", getFixedAssets);
router.post("/fixed-assets", createFixedAsset);

// Analytics & Reports
router.get("/reports/income-statement", getIncomeStatement);
router.get("/reports/balance-sheet", getBalanceSheet);
router.get("/reports/trend", getTrendData);

export default router;
