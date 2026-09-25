import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  generateAutoAlerts,
} from "../controllers/notificationController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Routes accessible with authentication
router.use(authenticate);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/", createNotification);
router.post("/generate-alerts", generateAutoAlerts);
router.patch("/mark-all-read", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
