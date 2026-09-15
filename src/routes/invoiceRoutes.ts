import { Router } from "express";
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoiceController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getAllInvoices);
router.get("/:invoiceId", getInvoiceById);
router.post("/", createInvoice);
router.put("/:invoiceId", updateInvoice);
router.delete("/:invoiceId", deleteInvoice);

export default router;
