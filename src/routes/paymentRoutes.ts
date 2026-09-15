import { Router } from "express";
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  deletePayment,
} from "../controllers/paymentController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getAllPayments);
router.get("/:paymentId", getPaymentById);
router.post("/", createPayment);
router.delete("/:paymentId", deletePayment);

export default router;
