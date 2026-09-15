import { Router } from "express";
import {
  getAllStockTransactions,
  createStockTransaction,
  getInventoryAlerts,
  dismissAlert,
} from "../controllers/stockController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/transactions", getAllStockTransactions);
router.post("/transactions", createStockTransaction);
router.get("/alerts", getInventoryAlerts);
router.delete("/alerts/:alertId", dismissAlert);

export default router;
