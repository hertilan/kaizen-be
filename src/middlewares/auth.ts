import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken, TokenPayload } from "../utils/auth.js";

export type Module = "INVENTORY" | "FINANCE" | "TASK";
export type PermissionLevel =
  | "FULL"
  | "FULL_TECHNICAL"
  | "MANAGE"
  | "APPROVE"
  | "LIMITED"
  | "VIEW"
  | "REPORTS"
  | "NONE";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const PERMISSION_MATRIX: Record<Role, Record<Module, PermissionLevel>> = {
  SUPER_ADMIN: { INVENTORY: "FULL", FINANCE: "FULL", TASK: "FULL" },
  MANAGING_DIRECTOR: { INVENTORY: "APPROVE", FINANCE: "APPROVE", TASK: "VIEW" },
  SYSTEM_ADMIN: { INVENTORY: "FULL_TECHNICAL", FINANCE: "FULL_TECHNICAL", TASK: "FULL_TECHNICAL" },
  FINANCE_MANAGER: { INVENTORY: "VIEW", FINANCE: "FULL", TASK: "VIEW" },
  ACCOUNTANT: { INVENTORY: "VIEW", FINANCE: "MANAGE", TASK: "LIMITED" },
  OPERATIONS_MANAGER: { INVENTORY: "MANAGE", FINANCE: "MANAGE", TASK: "MANAGE" },
  STORE_MANAGER: { INVENTORY: "MANAGE", FINANCE: "VIEW", TASK: "MANAGE" },
  PROCUREMENT_OFFICER: { INVENTORY: "MANAGE", FINANCE: "MANAGE", TASK: "LIMITED" },
  SALES_OFFICER: { INVENTORY: "VIEW", FINANCE: "VIEW", TASK: "LIMITED" },
  HR_ADMIN: { INVENTORY: "LIMITED", FINANCE: "MANAGE", TASK: "MANAGE" },
  DEPARTMENT_MANAGER: { INVENTORY: "VIEW", FINANCE: "MANAGE", TASK: "MANAGE" },
  STAFF: { INVENTORY: "LIMITED", FINANCE: "LIMITED", TASK: "LIMITED" },
  STOREKEEPER: { INVENTORY: "MANAGE", FINANCE: "LIMITED", TASK: "LIMITED" },
  AUDITOR: { INVENTORY: "VIEW", FINANCE: "VIEW", TASK: "VIEW" },
  APPROVER: { INVENTORY: "APPROVE", FINANCE: "APPROVE", TASK: "APPROVE" },
  VIEWER: { INVENTORY: "REPORTS", FINANCE: "REPORTS", TASK: "REPORTS" },
};

const LEVEL_HIERARCHY: Record<PermissionLevel, number> = {
  FULL: 7,
  FULL_TECHNICAL: 7,
  MANAGE: 6,
  APPROVE: 5,
  LIMITED: 4,
  VIEW: 3,
  REPORTS: 2,
  NONE: 0,
};

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.role !== "SUPER_ADMIN" && req.user.role !== "SYSTEM_ADMIN") {
    return res.status(403).json({ error: "Forbidden: Admin privileges required" });
  }

  next();
}

export function requirePermission(module: Module, requiredLevel: PermissionLevel) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userLevel = PERMISSION_MATRIX[req.user.role]?.[module] || "NONE";
    const userScore = LEVEL_HIERARCHY[userLevel];
    const requiredScore = LEVEL_HIERARCHY[requiredLevel];

    if (userScore < requiredScore) {
      return res.status(403).json({
        error: `Forbidden: Insufficient permissions for module ${module}. Required: ${requiredLevel}, user level: ${userLevel}`,
      });
    }

    next();
  };
}
