import { Router } from "express";
import {
  getEngineers,
  getProjects,
  getProjectById,
  createProject,
  updateProjectStatus,
  updateProject,
  getTransactions,
  createTransaction,
  getProjectFinancialSummary,
  getAllProjectsFinancialSummary,
  getPortfolioMetrics,
} from "../controllers/engController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Protect all Engineering endpoints with authentication
router.use(authenticate);

// Engineers list
router.get("/engineers", getEngineers);

// Projects
router.get("/projects/financial-summaries", getAllProjectsFinancialSummary);
router.get("/projects/portfolio-metrics", getPortfolioMetrics);
router.get("/projects/:projectId/financial-summary", getProjectFinancialSummary);
router.get("/projects/:id", getProjectById);
router.get("/projects", getProjects);
router.post("/projects", createProject);
router.patch("/projects/:id/status", updateProjectStatus);
router.patch("/projects/:id", updateProject);

// Transactions
router.get("/transactions", getTransactions);
router.post("/transactions", createTransaction);

export default router;
