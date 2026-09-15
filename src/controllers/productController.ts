import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { ProductStatus } from "@prisma/client";

export async function getAllProducts(req: Request, res: Response) {
  try {
    const { categoryId, status, search } = req.query;

    const where: any = {};

    if (categoryId && typeof categoryId === "string") {
      where.categoryId = categoryId;
    }

    if (status && typeof status === "string") {
      where.status = status as ProductStatus;
    }

    if (search && typeof search === "string") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { categoryId: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(products);
  } catch (error) {
    console.error("getAllProducts error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProductById(req: Request, res: Response) {
  try {
    const productId = req.params.productId as string;

    const product = await prisma.product.findUnique({
      where: { productId },
      include: {
        category: {
          select: { categoryId: true, name: true },
        },
        transactions: {
          take: 10,
          orderBy: { date: "desc" },
        },
        alerts: {
          take: 5,
          orderBy: { date: "desc" },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(product);
  } catch (error) {
    console.error("getProductById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const {
      code,
      name,
      categoryId,
      unit,
      purchasePrice,
      sellingPrice,
      stockQty,
      reorderLevel,
      status,
    } = req.body;

    if (!code || !name || !categoryId || !unit || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        error: "Code, name, categoryId, unit, purchasePrice, and sellingPrice are required",
      });
    }

    // Check category exists
    const categoryExists = await prisma.category.findUnique({
      where: { categoryId },
    });

    if (!categoryExists) {
      return res.status(400).json({ error: "Invalid categoryId provided" });
    }

    // Check code uniqueness
    const existingCode = await prisma.product.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existingCode) {
      return res.status(400).json({ error: `Product code '${code}' is already in use` });
    }

    const product = await prisma.product.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        categoryId,
        unit: unit.trim(),
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        stockQty: stockQty !== undefined ? Number(stockQty) : 0,
        reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : 0,
        status: status ? (status as ProductStatus) : ProductStatus.ACTIVE,
      },
      include: {
        category: {
          select: { categoryId: true, name: true },
        },
      },
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error("createProduct error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const productId = req.params.productId as string;
    const {
      code,
      name,
      categoryId,
      unit,
      purchasePrice,
      sellingPrice,
      stockQty,
      reorderLevel,
      status,
    } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { productId },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updateData: any = {};

    if (code !== undefined) {
      const formattedCode = code.trim().toUpperCase();
      if (formattedCode !== existingProduct.code) {
        const duplicate = await prisma.product.findUnique({
          where: { code: formattedCode },
        });
        if (duplicate) {
          return res.status(400).json({ error: `Product code '${code}' is already in use` });
        }
        updateData.code = formattedCode;
      }
    }

    if (categoryId !== undefined) {
      const categoryExists = await prisma.category.findUnique({
        where: { categoryId },
      });
      if (!categoryExists) {
        return res.status(400).json({ error: "Invalid categoryId provided" });
      }
      updateData.categoryId = categoryId;
    }

    if (name !== undefined) updateData.name = name.trim();
    if (unit !== undefined) updateData.unit = unit.trim();
    if (purchasePrice !== undefined) updateData.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) updateData.sellingPrice = Number(sellingPrice);
    if (stockQty !== undefined) updateData.stockQty = Number(stockQty);
    if (reorderLevel !== undefined) updateData.reorderLevel = Number(reorderLevel);
    if (status !== undefined) updateData.status = status as ProductStatus;

    const updatedProduct = await prisma.product.update({
      where: { productId },
      data: updateData,
      include: {
        category: {
          select: { categoryId: true, name: true },
        },
      },
    });

    return res.json(updatedProduct);
  } catch (error) {
    console.error("updateProduct error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const productId = req.params.productId as string;

    const product = await prisma.product.findUnique({
      where: { productId },
      include: {
        _count: {
          select: { transactions: true, purchaseItems: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product._count.transactions > 0 || product._count.purchaseItems > 0) {
      return res.status(400).json({
        error: "Cannot delete product that has existing stock transactions or purchase items",
      });
    }

    await prisma.product.delete({
      where: { productId },
    });

    return res.json({ message: "Product deleted successfully", productId });
  } catch (error) {
    console.error("deleteProduct error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
