import { Response } from "express";
import { prisma } from "../prisma.js";
import { hashPassword } from "../utils/auth.js";
import { Role } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/auth.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export async function getAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const isRequesterSuperAdmin = req.user?.role === "SUPER_ADMIN";

    // Non-SuperAdmin admins must not see or manage SUPER_ADMIN accounts
    const whereCondition = isRequesterSuperAdmin ? {} : { role: { not: Role.SUPER_ADMIN } };

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json(users);
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserById(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.params.userId as string;
    const isRequesterSuperAdmin = req.user?.role === "SUPER_ADMIN";

    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === Role.SUPER_ADMIN && !isRequesterSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Cannot view SuperAdmin accounts" });
    }

    return res.json(user);
  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, email, password, role, active, avatarUrl } = req.body;
    const isRequesterSuperAdmin = req.user?.role === "SUPER_ADMIN";

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password, and role are required" });
    }

    if (role === "SUPER_ADMIN" && !isRequesterSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Only SuperAdmin can create SuperAdmin accounts" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await hashPassword(password);
    const generatedUserId = `u${Date.now()}`;

    let uploadedAvatar = avatarUrl || null;
    if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("data:image/")) {
      uploadedAvatar = await uploadToCloudinary(avatarUrl, "kaizen/avatars");
    }

    const newUser = await prisma.user.create({
      data: {
        userId: generatedUserId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role as Role,
        active: active ?? true,
        avatarUrl: uploadedAvatar,
      },
      select: {
        id: true,
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

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.params.userId as string;
    const { name, email, role, active, avatarUrl, password } = req.body;
    const isRequesterSuperAdmin = req.user?.role === "SUPER_ADMIN";

    const existingUser = await prisma.user.findUnique({
      where: { userId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (existingUser.role === Role.SUPER_ADMIN && !isRequesterSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Cannot modify SuperAdmin accounts" });
    }

    if (role === "SUPER_ADMIN" && !isRequesterSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Cannot assign SuperAdmin role" });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (role !== undefined) updateData.role = role as Role;
    if (active !== undefined) updateData.active = active;
    if (avatarUrl !== undefined) {
      if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("data:image/")) {
        const cloudinaryUrl = await uploadToCloudinary(avatarUrl, "kaizen/avatars");
        updateData.avatarUrl = cloudinaryUrl;
      } else {
        updateData.avatarUrl = avatarUrl;
      }
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        id: true,
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

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.params.userId as string;
    const isRequesterSuperAdmin = req.user?.role === "SUPER_ADMIN";

    const existingUser = await prisma.user.findUnique({
      where: { userId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (existingUser.role === Role.SUPER_ADMIN && !isRequesterSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Cannot delete SuperAdmin accounts" });
    }

    await prisma.user.delete({
      where: { userId },
    });

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

