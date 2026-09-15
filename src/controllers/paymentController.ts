import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { PaymentDirection, PaymentMethod, PaymentStatus } from "@prisma/client";

function computeStatus(totalDue: number, totalPaid: number): PaymentStatus {
  if (totalDue <= 0 || totalPaid >= totalDue) return PaymentStatus.PAID;
  if (totalPaid <= 0) return PaymentStatus.UNPAID;
  return PaymentStatus.PARTIAL;
}

export async function getAllPayments(req: Request, res: Response) {
  try {
    const { direction, method, search } = req.query;

    const where: any = {};

    if (direction && typeof direction === "string") {
      where.direction = direction as PaymentDirection;
    }

    if (method && typeof method === "string") {
      where.method = method as PaymentMethod;
    }

    if (search && typeof search === "string") {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return res.json(payments);
  } catch (error) {
    console.error("getAllPayments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPaymentById(req: Request, res: Response) {
  try {
    const paymentId = req.params.paymentId as string;

    const payment = await prisma.payment.findUnique({
      where: { paymentId },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    return res.json(payment);
  } catch (error) {
    console.error("getPaymentById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createPayment(req: Request, res: Response) {
  try {
    const { direction, method, amount, reference, notes, date } = req.body;

    if (!direction || !method || amount === undefined || !reference) {
      return res.status(400).json({
        error: "direction, method, amount, and reference are required",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    const ref = String(reference).trim().toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.payment.create({
        data: {
          direction: direction as PaymentDirection,
          method: method as PaymentMethod,
          amount: numericAmount,
          reference: ref,
          notes: notes ? String(notes).trim() : null,
          date: date ? new Date(date) : new Date(),
        },
      });

      let updatedTargetMessage: string | null = null;

      // 2. Dynamic Linking to Invoice (direction = IN)
      if (payment.direction === PaymentDirection.IN) {
        const invoice = await tx.invoice.findUnique({
          where: { invoiceNumber: ref },
          include: { items: true },
        });

        if (invoice) {
          const invoiceTotal = invoice.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          );

          // Get all payments for this invoice reference
          const allPayments = await tx.payment.findMany({
            where: {
              direction: PaymentDirection.IN,
              reference: ref,
            },
          });

          const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
          const nextStatus = computeStatus(invoiceTotal, totalPaid);

          if (nextStatus !== invoice.status) {
            await tx.invoice.update({
              where: { invoiceId: invoice.invoiceId },
              data: { status: nextStatus },
            });
            updatedTargetMessage = `Invoice ${invoice.invoiceNumber} status updated to ${nextStatus}`;
          }
        }
      }

      // 3. Dynamic Linking to Purchase (direction = OUT)
      if (payment.direction === PaymentDirection.OUT) {
        const purchase = await tx.purchase.findUnique({
          where: { purchaseNumber: ref },
          include: { items: true },
        });

        if (purchase) {
          const purchaseTotal = purchase.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          );

          const allPayments = await tx.payment.findMany({
            where: {
              direction: PaymentDirection.OUT,
              reference: ref,
            },
          });

          const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
          const nextStatus = computeStatus(purchaseTotal, totalPaid);

          if (nextStatus !== purchase.paymentStatus) {
            await tx.purchase.update({
              where: { purchaseId: purchase.purchaseId },
              data: { paymentStatus: nextStatus },
            });
            updatedTargetMessage = `Purchase ${purchase.purchaseNumber} status updated to ${nextStatus}`;
          }
        }
      }

      return { payment, updatedTargetMessage };
    });

    return res.status(201).json({
      payment: result.payment,
      message: result.updatedTargetMessage || "Payment logged successfully",
    });
  } catch (error) {
    console.error("createPayment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deletePayment(req: Request, res: Response) {
  try {
    const paymentId = req.params.paymentId as string;

    const existing = await prisma.payment.findUnique({
      where: { paymentId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    await prisma.payment.delete({
      where: { paymentId },
    });

    return res.json({ message: "Payment record deleted successfully", paymentId });
  } catch (error) {
    console.error("deletePayment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
