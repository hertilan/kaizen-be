import { prisma } from "../prisma.js";
import { Role } from "@prisma/client";

export interface CreateNotificationInput {
  title: string;
  message: string;
  category?: "STOCK" | "TASK" | "FINANCE" | "SYSTEM";
  severity?: "INFO" | "WARNING" | "DANGER" | "SUCCESS";
  userId?: string;
  targetUrl?: string;
  metadata?: any;
}

export interface GetNotificationsQuery {
  userId?: string;
  role?: Role;
  category?: string;
  isRead?: boolean;
  limit?: number;
}

export class NotificationService {
  /**
   * Helper to derive permitted categories by User Role
   */
  private getPermittedCategoriesForRole(role?: Role): string[] | null {
    if (!role || role === Role.SUPER_ADMIN || role === Role.ADMIN) {
      return null; // All categories allowed
    }
    if (role === Role.FINANCE) {
      return ["FINANCE", "SYSTEM"];
    }
    if (role === Role.ENGINEER) {
      return ["TASK", "SYSTEM"];
    }
    if (role === Role.RETAILER || role === Role.WHOLESALE) {
      return ["STOCK", "SYSTEM"];
    }
    return null;
  }

  /**
   * Fetch list of notifications sorted by newest first, strictly scoped by role & user, deduplicated
   */
  public async getNotifications(query: GetNotificationsQuery) {
    const { userId, role, category, isRead, limit = 50 } = query;

    const where: any = {};

    // Scoping to User ID or global broadcast
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    // Role-based Category Filtering
    const permittedCategories = this.getPermittedCategoriesForRole(role);
    if (category && category !== "ALL") {
      if (!permittedCategories || permittedCategories.includes(category)) {
        where.category = category;
      } else {
        return [];
      }
    } else if (permittedCategories) {
      where.category = { in: permittedCategories };
    }

    if (typeof isRead === "boolean") {
      where.isRead = isRead;
    }

    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // In-memory deduplication by title + message
    const seen = new Set<string>();
    const uniqueItems = items.filter((item) => {
      const key = `${item.title.trim()}::${item.message.trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return uniqueItems;
  }

  /**
   * Get unread notifications count scoped by role & user
   */
  public async getUnreadCount(userId?: string, role?: Role) {
    const notifications = await this.getNotifications({ userId, role, isRead: false });
    return { unreadCount: notifications.length };
  }

  /**
   * Create a single notification with deduplication
   */
  public async createNotification(input: CreateNotificationInput) {
    const existing = await prisma.notification.findFirst({
      where: {
        title: input.title,
        message: input.message,
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.notification.create({
      data: {
        title: input.title,
        message: input.message,
        category: input.category || "SYSTEM",
        severity: input.severity || "INFO",
        userId: input.userId || null,
        targetUrl: input.targetUrl || null,
        metadata: input.metadata ? input.metadata : undefined,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  public async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for target user/role scope
   */
  public async markAllAsRead(userId?: string, role?: Role) {
    const where: any = { isRead: false };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    const permittedCategories = this.getPermittedCategoriesForRole(role);
    if (permittedCategories) {
      where.category = { in: permittedCategories };
    }

    await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return { success: true };
  }

  /**
   * Delete notification by ID
   */
  public async deleteNotification(id: string) {
    await prisma.notification.delete({
      where: { id },
    });
    return { success: true };
  }

  /**
   * Automated System Scanner to generate stock, task, & financial alerts with strict duplicate prevention
   */
  public async generateAutoAlerts() {
    const generated: string[] = [];
    const now = new Date();

    // 1. Stock Alerts
    const products = await prisma.product.findMany();
    for (const prod of products) {
      if (prod.stockQty <= 0) {
        const title = `Out of Stock: ${prod.name}`;
        const existing = await prisma.notification.findFirst({ where: { title } });
        if (!existing) {
          await this.createNotification({
            title,
            message: `Product "${prod.name}" (${prod.code}) has 0 remaining stock!`,
            category: "STOCK",
            severity: "DANGER",
            targetUrl: "/supplier-distribution/products",
            metadata: { productId: prod.productId },
          });
          generated.push(title);
        }
      } else if (prod.stockQty <= prod.reorderLevel) {
        const title = `Low Stock Warning: ${prod.name}`;
        const existing = await prisma.notification.findFirst({ where: { title } });
        if (!existing) {
          await this.createNotification({
            title,
            message: `Product "${prod.name}" (${prod.code}) has reached low stock level (${prod.stockQty}/${prod.reorderLevel}).`,
            category: "STOCK",
            severity: "WARNING",
            targetUrl: "/supplier-distribution/products",
            metadata: { productId: prod.productId },
          });
          generated.push(title);
        }
      }
    }

    // 2. Overdue Tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    });

    for (const task of overdueTasks) {
      const title = `Overdue Task: ${task.title}`;
      const existing = await prisma.notification.findFirst({ where: { title } });
      if (!existing) {
        await this.createNotification({
          title,
          message: `Task "${task.title}" is overdue (due: ${new Date(task.dueDate).toLocaleDateString()}).`,
          category: "TASK",
          severity: "WARNING",
          userId: task.assigneeId,
          targetUrl: "/engineering/projects",
          metadata: { taskId: task.taskId },
        });
        generated.push(title);
      }
    }

    // 3. Overdue Invoices / Debtors
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: now },
        status: { not: "PAID" },
      },
    });

    for (const inv of overdueInvoices) {
      const title = `Overdue Invoice #${inv.invoiceNumber}`;
      const existing = await prisma.notification.findFirst({ where: { title } });
      if (!existing) {
        await this.createNotification({
          title,
          message: `Invoice #${inv.invoiceNumber} for ${inv.customerName} is past due date.`,
          category: "FINANCE",
          severity: "DANGER",
          targetUrl: "/finance/debtors-creditors",
          metadata: { invoiceId: inv.invoiceId },
        });
        generated.push(title);
      }
    }

    return { generatedCount: generated.length, generatedAlerts: generated };
  }
}

export const notificationService = new NotificationService();
