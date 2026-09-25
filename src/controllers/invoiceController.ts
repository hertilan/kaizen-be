import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { PaymentStatus } from "@prisma/client";
import { notificationService } from "../services/notificationService.js";

export async function getAllInvoices(req: Request, res: Response) {
  try {
    const { status, search } = req.query;

    const where: any = {};

    if (status && typeof status === "string") {
      where.status = status as PaymentStatus;
    }

    if (search && typeof search === "string") {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: {
          include: {
            invoice: false,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return res.json(invoices);
  } catch (error) {
    console.error("getAllInvoices error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getInvoiceById(req: Request, res: Response) {
  try {
    const invoiceId = req.params.invoiceId as string;

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId },
      include: {
        items: true,
        tasks: {
          select: { taskId: true, title: true, status: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    return res.json(invoice);
  } catch (error) {
    console.error("getInvoiceById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createInvoice(req: Request, res: Response) {
  try {
    const { invoiceNumber, customerName, dueDate, status, notes, items } = req.body;

    if (!invoiceNumber || !customerName || !dueDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "invoiceNumber, customerName, dueDate, and non-empty items array are required",
      });
    }

    const formattedInvNumber = String(invoiceNumber).trim().toUpperCase();

    // Duplicate check
    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber: formattedInvNumber },
    });

    if (existing) {
      return res.status(400).json({
        error: `Invoice number '${formattedInvNumber}' is already in use`,
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.description || !item.quantity || item.quantity <= 0 || item.unitPrice === undefined) {
        return res.status(400).json({
          error: "Each item must have a description, positive quantity, and unitPrice",
        });
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: formattedInvNumber,
        customerName: String(customerName).trim(),
        dueDate: new Date(dueDate),
        status: status ? (status as PaymentStatus) : PaymentStatus.UNPAID,
        notes: notes ? String(notes).trim() : null,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            description: String(item.description).trim(),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Create finance notification for debtor / new invoice
    try {
      await notificationService.createNotification({
        title: `New Debtor / Invoice #${invoice.invoiceNumber}`,
        message: `Invoice #${invoice.invoiceNumber} created for ${invoice.customerName} (Due: ${new Date(invoice.dueDate).toLocaleDateString()}).`,
        category: "FINANCE",
        severity: invoice.status === "UNPAID" ? "WARNING" : "INFO",
        targetUrl: "/finance/debtors-creditors",
        metadata: { invoiceId: invoice.invoiceId },
      });
    } catch (notifErr) {
      console.error("Failed to create invoice notification:", notifErr);
    }

    return res.status(201).json(invoice);
  } catch (error) {
    console.error("createInvoice error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateInvoice(req: Request, res: Response) {
  try {
    const invoiceId = req.params.invoiceId as string;
    const { customerName, dueDate, status, notes } = req.body;

    const existing = await prisma.invoice.findUnique({
      where: { invoiceId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const updateData: any = {};
    if (customerName !== undefined) updateData.customerName = String(customerName).trim();
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status as PaymentStatus;
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;

    const updated = await prisma.invoice.update({
      where: { invoiceId },
      data: updateData,
      include: {
        items: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("updateInvoice error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteInvoice(req: Request, res: Response) {
  try {
    const invoiceId = req.params.invoiceId as string;

    const existing = await prisma.invoice.findUnique({
      where: { invoiceId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    await prisma.invoice.delete({
      where: { invoiceId },
    });

    return res.json({ message: "Invoice deleted successfully", invoiceId });
  } catch (error) {
    console.error("deleteInvoice error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
