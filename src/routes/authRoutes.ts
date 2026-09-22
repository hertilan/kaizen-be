import { Router } from "express";
import { login, getMe, updateProfile } from "../controllers/authController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, getMe);
router.put("/me", authenticate, updateProfile);

export default router;

