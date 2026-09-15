import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { hashPassword } from "../utils/auth.js";
import { Role } from "@prisma/client";

export async function getAllUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json(users);
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { name, email, password, role, active, avatarUrl } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password, and role are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role as Role,
        active: active ?? true,
        avatarUrl: avatarUrl || null,
      },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return res.status(201).json(newUser);
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const userId = req.params.userId as string;
    const { name, email, role, active, avatarUrl, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { userId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (role !== undefined) updateData.role = role as Role;
    if (active !== undefined) updateData.active = active;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
