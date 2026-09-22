import { Router } from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from "../controllers/userController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Admin-only user management endpoints
router.get("/", authenticate, requireAdmin, getAllUsers);
router.get("/:userId", authenticate, requireAdmin, getUserById);
router.post("/", authenticate, requireAdmin, createUser);
router.put("/:userId", authenticate, requireAdmin, updateUser);
router.delete("/:userId", authenticate, requireAdmin, deleteUser);

export default router;

