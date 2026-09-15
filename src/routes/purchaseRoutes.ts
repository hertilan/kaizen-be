import { Router } from "express";
import {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from "../controllers/purchaseController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getAllPurchases);
router.get("/:purchaseId", getPurchaseById);
router.post("/", createPurchase);
router.put("/:purchaseId", updatePurchase);
router.delete("/:purchaseId", deletePurchase);

export default router;
