import { Router } from "express";
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getAllExpenses);
router.get("/:expenseId", getExpenseById);
router.post("/", createExpense);
router.put("/:expenseId", updateExpense);
router.delete("/:expenseId", deleteExpense);

export default router;
