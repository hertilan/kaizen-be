import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { StockTransactionType, AlertKind } from "@prisma/client";

export async function getAllStockTransactions(req: Request, res: Response) {
  try {
    const { productId, type, startDate, endDate, search } = req.query;

    const where: any = {};

    if (productId && typeof productId === "string") {
      where.productId = productId;
    }

    if (type && typeof type === "string") {
      where.type = type as StockTransactionType;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate && typeof startDate === "string") {
        where.date.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === "string") {
        where.date.lte = new Date(endDate);
      }
    }

    if (search && typeof search === "string") {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { code: { contains: search, mode: "insensitive" } } },
      ];
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        product: {
          select: {
            productId: true,
            code: true,
            name: true,
            unit: true,
            stockQty: true,
            reorderLevel: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return res.json(transactions);
  } catch (error) {
    console.error("getAllStockTransactions error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createStockTransaction(req: Request, res: Response) {
  try {
    const { productId, type, quantity, reference, reason } = req.body;

    if (!productId || !type || quantity === undefined || !reference) {
      return res.status(400).json({
        error: "productId, type, quantity, and reference are required",
      });
    }

    const transactionType = type as StockTransactionType;
    if (!Object.values(StockTransactionType).includes(transactionType)) {
      return res.status(400).json({
        error: `Invalid transaction type '${type}'. Must be STOCK_IN, STOCK_OUT, ADJUSTMENT, or TRANSFER`,
      });
    }

    const numericQty = Number(quantity);
    if (isNaN(numericQty)) {
      return res.status(400).json({ error: "Quantity must be a valid number" });
    }

    const product = await prisma.product.findUnique({
      where: { productId },
    });

    if (!product) {
      return res.status(400).json({ error: "Product not found" });
    }

    let newStockQty = product.stockQty;
    let actualTransactionQty = numericQty;

    if (transactionType === StockTransactionType.STOCK_IN) {
      if (numericQty <= 0) {
        return res.status(400).json({ error: "Quantity for STOCK_IN must be greater than 0" });
      }
      newStockQty = product.stockQty + numericQty;
      actualTransactionQty = numericQty;
    } else if (
      transactionType === StockTransactionType.STOCK_OUT ||
      transactionType === StockTransactionType.TRANSFER
    ) {
      if (numericQty <= 0) {
        return res.status(400).json({ error: `Quantity for ${transactionType} must be greater than 0` });
      }
      if (product.stockQty < numericQty) {
        return res.status(400).json({
          error: `Insufficient stock available. Current stock: ${product.stockQty}, requested: ${numericQty}`,
        });
      }
      newStockQty = product.stockQty - numericQty;
      actualTransactionQty = numericQty;
    } else if (transactionType === StockTransactionType.ADJUSTMENT) {
      // In adjustment, quantity is the target stock level, or relative delta if specified
      if (numericQty < 0) {
        return res.status(400).json({ error: "Adjusted stock quantity cannot be negative" });
      }
      newStockQty = numericQty;
      actualTransactionQty = Math.abs(newStockQty - product.stockQty);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { productId },
        data: { stockQty: newStockQty },
      });

      // Create stock transaction record
      const transaction = await tx.stockTransaction.create({
        data: {
          productId,
          type: transactionType,
          quantity: actualTransactionQty,
          reference: String(reference).trim().toUpperCase(),
          reason: reason ? String(reason).trim() : null,
        },
        include: {
          product: {
            select: {
              productId: true,
              code: true,
              name: true,
              unit: true,
              stockQty: true,
              reorderLevel: true,
            },
          },
        },
      });

      // Automatically generate low stock or out of stock alerts
      if (newStockQty <= 0) {
        await tx.alertItem.create({
          data: {
            productId,
            kind: AlertKind.OUT_OF_STOCK,
            message: `Product '${product.name}' (${product.code}) is OUT OF STOCK!`,
          },
        });
      } else if (newStockQty <= product.reorderLevel) {
        await tx.alertItem.create({
          data: {
            productId,
            kind: AlertKind.LOW_STOCK,
            message: `Product '${product.name}' (${product.code}) is LOW IN STOCK (${newStockQty} left, reorder level: ${product.reorderLevel})`,
          },
        });
      }

      return { transaction, newStockQty: updatedProduct.stockQty };
    });

    return res.status(201).json(result.transaction);
  } catch (error) {
    console.error("createStockTransaction error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getInventoryAlerts(req: Request, res: Response) {
  try {
    const { kind } = req.query;

    const where: any = {};
    if (kind && typeof kind === "string") {
      where.kind = kind as AlertKind;
    }

    const alerts = await prisma.alertItem.findMany({
      where,
      include: {
        product: {
          select: {
            productId: true,
            code: true,
            name: true,
            unit: true,
            stockQty: true,
            reorderLevel: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return res.json(alerts);
  } catch (error) {
    console.error("getInventoryAlerts error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function dismissAlert(req: Request, res: Response) {
  try {
    const alertId = req.params.alertId as string;

    const alert = await prisma.alertItem.findUnique({
      where: { alertId },
    });

    if (!alert) {
      return res.status(404).json({ error: "Alert item not found" });
    }

    await prisma.alertItem.delete({
      where: { alertId },
    });

    return res.json({ message: "Alert dismissed successfully", alertId });
  } catch (error) {
    console.error("dismissAlert error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
