import { Router } from "express";
import { getAllUsers, createUser, updateUser } from "../controllers/userController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Admin-only endpoints
router.get("/", authenticate, requireAdmin, getAllUsers);
router.post("/", authenticate, requireAdmin, createUser);
router.put("/:userId", authenticate, requireAdmin, updateUser);

export default router;
