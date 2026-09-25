import { Response } from "express";
import { prisma } from "../prisma.js";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/auth.js";
import { notificationService } from "../services/notificationService.js";

export async function getAllTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, priority, assigneeId, department, search } = req.query;

    const where: any = {};

    if (status && typeof status === "string") {
      where.status = status as TaskStatus;
    }

    if (priority && typeof priority === "string") {
      where.priority = priority as TaskPriority;
    }

    if (assigneeId && typeof assigneeId === "string") {
      where.assigneeId = assigneeId;
    }

    if (department && typeof department === "string") {
      where.department = department;
    }

    if (search && typeof search === "string") {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { userId: true, name: true, email: true, role: true, avatarUrl: true },
        },
        invoice: {
          select: { invoiceId: true, invoiceNumber: true, customerName: true, status: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(tasks);
  } catch (error) {
    console.error("getAllTasks error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTaskById(req: AuthenticatedRequest, res: Response) {
  try {
    const taskId = req.params.taskId as string;

    const task = await prisma.task.findUnique({
      where: { taskId },
      include: {
        assignee: {
          select: { userId: true, name: true, email: true, role: true, avatarUrl: true },
        },
        invoice: {
          select: { invoiceId: true, invoiceNumber: true, customerName: true, status: true },
        },
        comments: {
          orderBy: { date: "asc" },
        },
        history: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.json(task);
  } catch (error) {
    console.error("getTaskById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createTask(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      department,
      startDate,
      dueDate,
      invoiceId,
    } = req.body;

    if (!title || !assigneeId || !department || !startDate || !dueDate) {
      return res.status(400).json({
        error: "title, assigneeId, department, startDate, and dueDate are required",
      });
    }

    const assignee = await prisma.user.findUnique({
      where: { userId: assigneeId },
    });

    if (!assignee) {
      return res.status(400).json({ error: "Assignee user not found" });
    }

    if (invoiceId) {
      const invoiceExists = await prisma.invoice.findUnique({
        where: { invoiceId },
      });
      if (!invoiceExists) {
        return res.status(400).json({ error: "Invoice not found" });
      }
    }

    const newTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
          status: status ? (status as TaskStatus) : TaskStatus.NOT_STARTED,
          priority: priority ? (priority as TaskPriority) : TaskPriority.MEDIUM,
          assigneeId,
          department: String(department).trim(),
          startDate: new Date(startDate),
          dueDate: new Date(dueDate),
          invoiceId: invoiceId || null,
        },
        include: {
          assignee: {
            select: { userId: true, name: true, email: true, role: true, avatarUrl: true },
          },
          invoice: {
            select: { invoiceId: true, invoiceNumber: true, customerName: true },
          },
        },
      });

      // Initial task history entry
      await tx.taskHistoryEntry.create({
        data: {
          taskId: task.taskId,
          message: `Task created and assigned to ${assignee.name}`,
        },
      });

      return task;
    });

    // Notify assignee
    if (newTask.assigneeId) {
      try {
        await notificationService.createNotification({
          title: `New Task Assigned: ${newTask.title}`,
          message: `You have been assigned task "${newTask.title}" in ${newTask.department}.`,
          category: "TASK",
          severity: newTask.priority === "HIGH" || newTask.priority === "URGENT" ? "WARNING" : "INFO",
          userId: newTask.assigneeId,
          targetUrl: "/engineering/projects",
          metadata: { taskId: newTask.taskId },
        });
      } catch (notifErr) {
        console.error("Failed to create task notification:", notifErr);
      }
    }

    return res.status(201).json(newTask);
  } catch (error) {
    console.error("createTask error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateTask(req: AuthenticatedRequest, res: Response) {
  try {
    const taskId = req.params.taskId as string;
    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      department,
      startDate,
      dueDate,
      invoiceId,
    } = req.body;

    const existing = await prisma.task.findUnique({
      where: { taskId },
      include: { assignee: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updateData: any = {};
    const historyMessages: string[] = [];

    if (title !== undefined) updateData.title = String(title).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (department !== undefined) updateData.department = String(department).trim();
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (invoiceId !== undefined) updateData.invoiceId = invoiceId || null;

    if (priority !== undefined && priority !== existing.priority) {
      updateData.priority = priority as TaskPriority;
      historyMessages.push(`Priority changed from ${existing.priority} to ${priority}`);
    }

    if (status !== undefined && status !== existing.status) {
      updateData.status = status as TaskStatus;
      historyMessages.push(`Status changed from ${existing.status} to ${status}`);
    }

    if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
      const newAssignee = await prisma.user.findUnique({ where: { userId: assigneeId } });
      if (!newAssignee) {
        return res.status(400).json({ error: "New assignee user not found" });
      }
      updateData.assigneeId = assigneeId;
      historyMessages.push(`Reassigned from ${existing.assignee.name} to ${newAssignee.name}`);
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { taskId },
        data: updateData,
        include: {
          assignee: {
            select: { userId: true, name: true, email: true, role: true, avatarUrl: true },
          },
          invoice: {
            select: { invoiceId: true, invoiceNumber: true, customerName: true },
          },
        },
      });

      for (const msg of historyMessages) {
        await tx.taskHistoryEntry.create({
          data: {
            taskId,
            message: msg,
          },
        });
      }

      return task;
    });

    return res.json(updatedTask);
  } catch (error) {
    console.error("updateTask error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteTask(req: AuthenticatedRequest, res: Response) {
  try {
    const taskId = req.params.taskId as string;

    const existing = await prisma.task.findUnique({
      where: { taskId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }

    await prisma.task.delete({
      where: { taskId },
    });

    return res.json({ message: "Task deleted successfully", taskId });
  } catch (error) {
    console.error("deleteTask error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function addTaskComment(req: AuthenticatedRequest, res: Response) {
  try {
    const taskId = req.params.taskId as string;
    const { message, authorName } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Comment message is required" });
    }

    const task = await prisma.task.findUnique({
      where: { taskId },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    let finalAuthorName = authorName ? String(authorName).trim() : "";
    if (!finalAuthorName && req.user?.userId) {
      const user = await prisma.user.findUnique({
        where: { userId: req.user.userId },
      });
      if (user) {
        finalAuthorName = user.name;
      }
    }

    if (!finalAuthorName) {
      finalAuthorName = "Anonymous";
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        message: String(message).trim(),
        authorName: finalAuthorName,
      },
    });

    return res.status(201).json(comment);
  } catch (error) {
    console.error("addTaskComment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTaskComments(req: AuthenticatedRequest, res: Response) {
  try {
    const taskId = req.params.taskId as string;

    const task = await prisma.task.findUnique({
      where: { taskId },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { date: "asc" },
    });

    return res.json(comments);
  } catch (error) {
    console.error("getTaskComments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
