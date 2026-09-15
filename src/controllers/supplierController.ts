import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export async function getAllSuppliers(req: Request, res: Response) {
  try {
    const { search } = req.query;

    const where: any = {};
    if (search && typeof search === "string") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(suppliers);
  } catch (error) {
    console.error("getAllSuppliers error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSupplierById(req: Request, res: Response) {
  try {
    const supplierId = req.params.supplierId as string;

    const supplier = await prisma.supplier.findUnique({
      where: { supplierId },
      include: {
        purchases: {
          orderBy: { date: "desc" },
          include: {
            items: {
              include: {
                product: {
                  select: { productId: true, code: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    return res.json(supplier);
  } catch (error) {
    console.error("getSupplierById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createSupplier(req: Request, res: Response) {
  try {
    const { name, contactPerson, phone, email, address, productsSupplied } = req.body;

    if (!name || !contactPerson || !phone || !email || !address) {
      return res.status(400).json({
        error: "Name, contactPerson, phone, email, and address are required",
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        address: address.trim(),
        productsSupplied: Array.isArray(productsSupplied) ? productsSupplied : [],
      },
    });

    return res.status(201).json(supplier);
  } catch (error) {
    console.error("createSupplier error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateSupplier(req: Request, res: Response) {
  try {
    const supplierId = req.params.supplierId as string;
    const { name, contactPerson, phone, email, address, productsSupplied } = req.body;

    const existingSupplier = await prisma.supplier.findUnique({
      where: { supplierId },
    });

    if (!existingSupplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (address !== undefined) updateData.address = address.trim();
    if (productsSupplied !== undefined) {
      updateData.productsSupplied = Array.isArray(productsSupplied) ? productsSupplied : [];
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { supplierId },
      data: updateData,
    });

    return res.json(updatedSupplier);
  } catch (error) {
    console.error("updateSupplier error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteSupplier(req: Request, res: Response) {
  try {
    const supplierId = req.params.supplierId as string;

    const supplier = await prisma.supplier.findUnique({
      where: { supplierId },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    if (supplier._count.purchases > 0) {
      return res.status(400).json({
        error: `Cannot delete supplier because it has ${supplier._count.purchases} linked purchase orders`,
      });
    }

    await prisma.supplier.delete({
      where: { supplierId },
    });

    return res.json({ message: "Supplier deleted successfully", supplierId });
  } catch (error) {
    console.error("deleteSupplier error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
