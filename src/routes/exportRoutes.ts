import { Router } from "express";
import { exportExcel, exportPdf, exportInvoicePdf } from "../controllers/exportController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Enable authentication middleware if auth token provided, or allow export
router.use((req, res, next) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
});

router.post("/excel", exportExcel);
router.post("/pdf", exportPdf);
router.post("/invoice-pdf", exportInvoicePdf);

export default router;
