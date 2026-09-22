import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { comparePassword, hashPassword, generateToken } from "../utils/auth.js";
import { AuthenticatedRequest } from "../middlewares/auth.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is deactivated. Contact an administrator." });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    return res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
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

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, avatarUrl, newPassword } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (avatarUrl !== undefined) {
      if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("data:image/")) {
        const cloudinaryUrl = await uploadToCloudinary(avatarUrl, "kaizen/avatars");
        updateData.avatarUrl = cloudinaryUrl;
      } else {
        updateData.avatarUrl = avatarUrl;
      }
    }
    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { userId: req.user.userId },
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
    console.error("updateProfile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

