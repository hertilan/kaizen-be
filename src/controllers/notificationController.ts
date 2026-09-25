import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.js";
import { notificationService } from "../services/notificationService.js";

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const category = req.query.category as string | undefined;
    const isReadParam = req.query.isRead as string | undefined;
    const limitParam = req.query.limit as string | undefined;

    // Run auto alert scanner for low stock, overdue tasks & invoices
    try {
      await notificationService.generateAutoAlerts();
    } catch (autoErr) {
      console.error("Auto alert generation error:", autoErr);
    }

    const isRead = isReadParam !== undefined ? isReadParam === "true" : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const notifications = await notificationService.getNotifications({
      userId,
      role,
      category,
      isRead,
      limit,
    });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch notifications" });
  }
}

export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    // Run auto alert scanner
    try {
      await notificationService.generateAutoAlerts();
    } catch (autoErr) {
      console.error("Auto alert generation error:", autoErr);
    }

    const stats = await notificationService.getUnreadCount(userId, role);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch unread count" });
  }
}

export async function createNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, message, category, severity, userId, targetUrl, metadata } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const notification = await notificationService.createNotification({
      title,
      message,
      category,
      severity,
      userId: userId || req.user?.userId,
      targetUrl,
      metadata,
    });

    res.status(201).json(notification);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create notification" });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const updated = await notificationService.markAsRead(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to mark notification as read" });
  }
}

export async function markAllAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const result = await notificationService.markAllAsRead(userId, role);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to mark all as read" });
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const result = await notificationService.deleteNotification(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete notification" });
  }
}

export async function generateAutoAlerts(_req: AuthenticatedRequest, res: Response) {
  try {
    const result = await notificationService.generateAutoAlerts();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate auto alerts" });
  }
}
