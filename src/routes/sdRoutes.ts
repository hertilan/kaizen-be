import { Router } from "express";
import {
  getShops,
  getCategories,
  getAttributeTemplates,
  getProducts,
  createProduct,
  getProductStockInfo,
  getAllProductsStockInfo,
  getPurchases,
  createPurchase,
  getSales,
  createSale,
  getClients,
  createClient,
  getSummaryMetrics,
} from "../controllers/sdController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Protect all Supplier & Distribution endpoints with authentication
router.use(authenticate);

// Shops
router.get("/shops", getShops);

// Categories & Templates
router.get("/categories", getCategories);
router.get("/attribute-templates", getAttributeTemplates);

// Products & Stock Info
router.get("/products/stock-info", getAllProductsStockInfo);
router.get("/products/:productId/stock-info", getProductStockInfo);
router.get("/products", getProducts);
router.post("/products", createProduct);

// Purchases
router.get("/purchases", getPurchases);
router.post("/purchases", createPurchase);

// Sales
router.get("/sales", getSales);
router.post("/sales", createSale);

// Clients
router.get("/clients", getClients);
router.post("/clients", createClient);

// Metrics
router.get("/summary-metrics", getSummaryMetrics);

export default router;
