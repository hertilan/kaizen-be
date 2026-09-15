import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { PaymentStatus, StockTransactionType } from "@prisma/client";

export async function getAllPurchases(req: Request, res: Response) {
  try {
    const { supplierId, paymentStatus, search } = req.query;

    const where: any = {};

    if (supplierId && typeof supplierId === "string") {
      where.supplierId = supplierId;
    }

    if (paymentStatus && typeof paymentStatus === "string") {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    if (search && typeof search === "string") {
      where.OR = [
        { purchaseNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: {
          select: { supplierId: true, name: true, contactPerson: true },
        },
        items: {
          include: {
            product: {
              select: { productId: true, code: true, name: true, unit: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return res.json(purchases);
  } catch (error) {
    console.error("getAllPurchases error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPurchaseById(req: Request, res: Response) {
  try {
    const purchaseId = req.params.purchaseId as string;

    const purchase = await prisma.purchase.findUnique({
      where: { purchaseId },
      include: {
        supplier: {
          select: {
            supplierId: true,
            name: true,
            contactPerson: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                productId: true,
                code: true,
                name: true,
                unit: true,
                sellingPrice: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    return res.json(purchase);
  } catch (error) {
    console.error("getPurchaseById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createPurchase(req: Request, res: Response) {
  try {
    const { purchaseNumber, supplierId, paymentStatus, notes, items } = req.body;

    if (!purchaseNumber || !supplierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "purchaseNumber, supplierId, and non-empty items array are required",
      });
    }

    const formattedPoNumber = purchaseNumber.trim().toUpperCase();

    // Check supplier existence
    const supplierExists = await prisma.supplier.findUnique({
      where: { supplierId },
    });

    if (!supplierExists) {
      return res.status(400).json({ error: "Supplier not found" });
    }

    // Check duplicate purchase number
    const existingPo = await prisma.purchase.findUnique({
      where: { purchaseNumber: formattedPoNumber },
    });

    if (existingPo) {
      return res.status(400).json({
        error: `Purchase number '${formattedPoNumber}' is already in use`,
      });
    }

    // Validate items and products
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0 || item.unitPrice === undefined) {
        return res.status(400).json({
          error: "Each item must have a valid productId, positive quantity, and unitPrice",
        });
      }

      const productExists = await prisma.product.findUnique({
        where: { productId: item.productId },
      });

      if (!productExists) {
        return res.status(400).json({ error: `Product ID '${item.productId}' not found` });
      }
    }

    // Create purchase, items, update product stock, and log stock transactions in transaction
    const newPurchase = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber: formattedPoNumber,
          supplierId,
          paymentStatus: paymentStatus ? (paymentStatus as PaymentStatus) : PaymentStatus.UNPAID,
          notes: notes ? String(notes).trim() : null,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
            })),
          },
        },
        include: {
          supplier: { select: { supplierId: true, name: true } },
          items: {
            include: {
              product: { select: { productId: true, code: true, name: true } },
            },
          },
        },
      });

      // Update product stock and log stock transaction for each item
      for (const item of items) {
        await tx.product.update({
          where: { productId: item.productId },
          data: {
            stockQty: { increment: Number(item.quantity) },
          },
        });

        await tx.stockTransaction.create({
          data: {
            productId: item.productId,
            type: StockTransactionType.STOCK_IN,
            quantity: Number(item.quantity),
            reference: formattedPoNumber,
            reason: `Purchase Order ${formattedPoNumber}`,
          },
        });
      }

      return purchase;
    });

    return res.status(201).json(newPurchase);
  } catch (error) {
    console.error("createPurchase error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updatePurchase(req: Request, res: Response) {
  try {
    const purchaseId = req.params.purchaseId as string;
    const { paymentStatus, notes } = req.body;

    const existingPurchase = await prisma.purchase.findUnique({
      where: { purchaseId },
    });

    if (!existingPurchase) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const updateData: any = {};
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus as PaymentStatus;
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;

    const updatedPurchase = await prisma.purchase.update({
      where: { purchaseId },
      data: updateData,
      include: {
        supplier: { select: { supplierId: true, name: true } },
        items: {
          include: {
            product: { select: { productId: true, code: true, name: true } },
          },
        },
      },
    });

    return res.json(updatedPurchase);
  } catch (error) {
    console.error("updatePurchase error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deletePurchase(req: Request, res: Response) {
  try {
    const purchaseId = req.params.purchaseId as string;

    const purchase = await prisma.purchase.findUnique({
      where: { purchaseId },
    });

    if (!purchase) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    await prisma.purchase.delete({
      where: { purchaseId },
    });

    return res.json({ message: "Purchase order deleted successfully", purchaseId });
  } catch (error) {
    console.error("deletePurchase error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
