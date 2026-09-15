import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { ExpenseCategory, PaymentMethod } from "@prisma/client";

export async function getAllExpenses(req: Request, res: Response) {
  try {
    const { category, paymentMethod, search } = req.query;

    const where: any = {};

    if (category && typeof category === "string") {
      where.category = category as ExpenseCategory;
    }

    if (paymentMethod && typeof paymentMethod === "string") {
      where.paymentMethod = paymentMethod as PaymentMethod;
    }

    if (search && typeof search === "string") {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { responsiblePerson: { contains: search, mode: "insensitive" } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return res.json(expenses);
  } catch (error) {
    console.error("getAllExpenses error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getExpenseById(req: Request, res: Response) {
  try {
    const expenseId = req.params.expenseId as string;

    const expense = await prisma.expense.findUnique({
      where: { expenseId },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense record not found" });
    }

    return res.json(expense);
  } catch (error) {
    console.error("getExpenseById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createExpense(req: Request, res: Response) {
  try {
    const { category, description, amount, paymentMethod, responsiblePerson, date } = req.body;

    if (!category || !description || amount === undefined || !paymentMethod || !responsiblePerson) {
      return res.status(400).json({
        error: "category, description, amount, paymentMethod, and responsiblePerson are required",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    const expense = await prisma.expense.create({
      data: {
        category: category as ExpenseCategory,
        description: String(description).trim(),
        amount: numericAmount,
        paymentMethod: paymentMethod as PaymentMethod,
        responsiblePerson: String(responsiblePerson).trim(),
        date: date ? new Date(date) : new Date(),
      },
    });

    return res.status(201).json(expense);
  } catch (error) {
    console.error("createExpense error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateExpense(req: Request, res: Response) {
  try {
    const expenseId = req.params.expenseId as string;
    const { category, description, amount, paymentMethod, responsiblePerson, date } = req.body;

    const existing = await prisma.expense.findUnique({
      where: { expenseId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Expense record not found" });
    }

    const updateData: any = {};
    if (category !== undefined) updateData.category = category as ExpenseCategory;
    if (description !== undefined) updateData.description = String(description).trim();
    if (amount !== undefined) updateData.amount = Number(amount);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod as PaymentMethod;
    if (responsiblePerson !== undefined) updateData.responsiblePerson = String(responsiblePerson).trim();
    if (date !== undefined) updateData.date = new Date(date);

    const updated = await prisma.expense.update({
      where: { expenseId },
      data: updateData,
    });

    return res.json(updated);
  } catch (error) {
    console.error("updateExpense error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteExpense(req: Request, res: Response) {
  try {
    const expenseId = req.params.expenseId as string;

    const existing = await prisma.expense.findUnique({
      where: { expenseId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Expense record not found" });
    }

    await prisma.expense.delete({
      where: { expenseId },
    });

    return res.json({ message: "Expense record deleted successfully", expenseId });
  } catch (error) {
    console.error("deleteExpense error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
