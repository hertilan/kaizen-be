import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export async function getAllCategories(_req: Request, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parentCategory: {
          select: { categoryId: true, name: true },
        },
        subCategories: {
          select: { categoryId: true, name: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json(categories);
  } catch (error) {
    console.error("getAllCategories error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getCategoryById(req: Request, res: Response) {
  try {
    const categoryId = req.params.categoryId as string;

    const category = await prisma.category.findUnique({
      where: { categoryId },
      include: {
        parentCategory: {
          select: { categoryId: true, name: true },
        },
        subCategories: {
          select: { categoryId: true, name: true },
        },
        products: {
          select: {
            productId: true,
            code: true,
            name: true,
            sellingPrice: true,
            stockQty: true,
            status: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    return res.json(category);
  } catch (error) {
    console.error("getCategoryById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const { name, parentCategoryId } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    if (parentCategoryId) {
      const parent = await prisma.category.findUnique({
        where: { categoryId: parentCategoryId },
      });
      if (!parent) {
        return res.status(400).json({ error: "Parent category not found" });
      }
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        parentCategoryId: parentCategoryId || null,
      },
      include: {
        parentCategory: {
          select: { categoryId: true, name: true },
        },
        subCategories: {
          select: { categoryId: true, name: true },
        },
      },
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error("createCategory error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const categoryId = req.params.categoryId as string;
    const { name, parentCategoryId } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { categoryId },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (parentCategoryId === categoryId) {
      return res.status(400).json({ error: "A category cannot be its own parent" });
    }

    if (parentCategoryId) {
      const parent = await prisma.category.findUnique({
        where: { categoryId: parentCategoryId },
      });
      if (!parent) {
        return res.status(400).json({ error: "Parent category not found" });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (parentCategoryId !== undefined) updateData.parentCategoryId = parentCategoryId || null;

    const updatedCategory = await prisma.category.update({
      where: { categoryId },
      data: updateData,
      include: {
        parentCategory: {
          select: { categoryId: true, name: true },
        },
        subCategories: {
          select: { categoryId: true, name: true },
        },
      },
    });

    return res.json(updatedCategory);
  } catch (error) {
    console.error("updateCategory error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const categoryId = req.params.categoryId as string;

    const category = await prisma.category.findUnique({
      where: { categoryId },
      include: {
        _count: {
          select: { products: true, subCategories: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (category._count.products > 0) {
      return res.status(400).json({
        error: `Cannot delete category because it contains ${category._count.products} products`,
      });
    }

    if (category._count.subCategories > 0) {
      return res.status(400).json({
        error: `Cannot delete category because it has ${category._count.subCategories} subcategories`,
      });
    }

    await prisma.category.delete({
      where: { categoryId },
    });

    return res.json({ message: "Category deleted successfully", categoryId });
  } catch (error) {
    console.error("deleteCategory error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
