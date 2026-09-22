import { Response } from "express";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../middlewares/auth.js";

// Static Seed Engineers list (matching system users & engineer roles)
export const SEED_ENGINEERS = [
  { id: "u6", name: "Emmanuel Bizimana", title: "Lead Civil Engineer", email: "emmanuel@kgst.rw" },
  { id: "usr-eng-001", name: "Jean-Claude Mugisha", title: "Senior Structural Specialist", email: "jean-claude@santech.rw" },
  { id: "usr-eng-002", name: "Patrick Bizimana", title: "Structural Steel Specialist", email: "patrick@santech.rw" },
  { id: "usr-eng-003", name: "Divine Uwase", title: "MEP & Electrical Systems Engineer", email: "divine@santech.rw" },
];

// Helper for engineer scoping
function getScopedOwnerId(req: AuthenticatedRequest, queryOwnerId?: string): string | undefined {
  const user = req.user;
  if (!user) return queryOwnerId === "ALL" ? undefined : queryOwnerId;

  // Admin & Super Admin can view all or filter by queryOwnerId
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    if (!queryOwnerId || queryOwnerId === "ALL") return undefined;
    return queryOwnerId;
  }

  // Engineer role is scoped to their own userId (or queryOwnerId if matching)
  if (user.role === "ENGINEER") {
    if (queryOwnerId && queryOwnerId !== "ALL" && queryOwnerId !== user.userId) {
      return queryOwnerId;
    }
    return user.userId;
  }

  if (!queryOwnerId || queryOwnerId === "ALL") return undefined;
  return queryOwnerId;
}

// ---------------------------------------------------------------------------
// 1. ENGINEERS
// ---------------------------------------------------------------------------

export async function getEngineers(_req: AuthenticatedRequest, res: Response) {
  return res.json(SEED_ENGINEERS);
}

// ---------------------------------------------------------------------------
// 2. PROJECTS CRUD & LIFECYCLE
// ---------------------------------------------------------------------------

export async function getProjects(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, ownerId: queryOwnerId } = req.query as { status?: string; ownerId?: string };
    const scopedOwnerId = getScopedOwnerId(req, queryOwnerId);

    const whereClause: any = {};
    if (status && status !== "ALL") {
      whereClause.status = status;
    }
    if (scopedOwnerId && scopedOwnerId !== "ALL") {
      whereClause.ownerId = scopedOwnerId;
    }

    const projects = await prisma.engProject.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return res.json(projects);
  } catch (error) {
    console.error("getProjects error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProjectById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const project = await prisma.engProject.findUnique({
      where: { id: id as string },
      include: { transactions: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.json(project);
  } catch (error) {
    console.error("getProjectById error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createProject(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      projectName,
      clientName,
      clientContact,
      ownerId,
      ownerName,
      startDate,
      endDate,
      status,
      quotationRef,
      lpoRef,
      invoiceRef,
      location,
      description,
    } = req.body;

    // Generate unique project number PRJ-2026-XXX
    const count = await prisma.engProject.count();
    const projectNumber = `PRJ-2026-${(count + 1).toString().padStart(3, "0")}`;

    const user = req.user;
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

    let finalOwnerId = ownerId;
    let finalOwnerName = ownerName;

    // If regular Engineer, force ownerId to current user
    if (!isAdmin && user) {
      finalOwnerId = user.userId;
      const matchedEng = SEED_ENGINEERS.find((e) => e.id === user.userId);
      finalOwnerName = matchedEng?.name || "Assigned Engineer";
    } else {
      const matchedEng = SEED_ENGINEERS.find((e) => e.id === ownerId);
      if (matchedEng) {
        finalOwnerId = matchedEng.id;
        finalOwnerName = matchedEng.name;
      }
    }

    const newProject = await prisma.engProject.create({
      data: {
        projectNumber,
        projectName,
        clientName,
        clientContact,
        ownerId: finalOwnerId || user?.userId || "u6",
        ownerName: finalOwnerName || "Emmanuel Bizimana",
        startDate: startDate || new Date().toISOString().slice(0, 10),
        endDate: endDate || new Date().toISOString().slice(0, 10),
        status: status || "QUOTED",
        quotationRef,
        lpoRef,
        invoiceRef,
        location,
        description,
      },
    });

    return res.status(201).json(newProject);
  } catch (error) {
    console.error("createProject error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProjectStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedProject = await prisma.engProject.update({
      where: { id: id as string },
      data: { status },
    });

    return res.json(updatedProject);
  } catch (error) {
    console.error("updateProjectStatus error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProject(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const user = req.user;
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

    // Non-admins cannot reassign project ownership
    if (!isAdmin && updates.ownerId) {
      delete updates.ownerId;
      delete updates.ownerName;
    } else if (isAdmin && updates.ownerId) {
      const matchedEng = SEED_ENGINEERS.find((e) => e.id === updates.ownerId);
      if (matchedEng) {
        updates.ownerName = matchedEng.name;
      }
    }

    const updatedProject = await prisma.engProject.update({
      where: { id: id as string },
      data: updates,
    });

    return res.json(updatedProject);
  } catch (error) {
    console.error("updateProject error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 3. TRANSACTIONS (WITH FINANCE ACCOUNTS WIRING)
// ---------------------------------------------------------------------------

export async function getTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    const { projectId, ownerId: queryOwnerId } = req.query as { projectId?: string; ownerId?: string };
    const scopedOwnerId = getScopedOwnerId(req, queryOwnerId);

    const whereClause: any = {};
    if (projectId && projectId !== "ALL") {
      whereClause.projectId = projectId;
    }

    if (scopedOwnerId && scopedOwnerId !== "ALL") {
      // Find project IDs belonging to this owner
      const ownerProjects = await prisma.engProject.findMany({
        where: { ownerId: scopedOwnerId },
        select: { id: true },
      });
      const ownerProjectIds = ownerProjects.map((p) => p.id);
      whereClause.projectId = { in: ownerProjectIds };
    }

    const transactions = await prisma.engTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return res.json(transactions);
  } catch (error) {
    console.error("getTransactions error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      projectId,
      date,
      description,
      type,
      expenditureCategory,
      amount,
      accountId,
      isInternalSupply,
      notes,
    } = req.body;

    const project = await prisma.engProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Step 3 Wiring: Validate Finance Account reference
    const numAmount = Number(amount);
    let accountName = "Finance Account";

    if (accountId) {
      const account = await prisma.financeAccount.findUnique({
        where: { id: accountId },
      });

      if (account) {
        accountName = account.name;

        // Post transaction balance impact to Finance chart of accounts
        const balanceDelta = type === "INCOME" ? numAmount : -numAmount;
        await prisma.financeAccount.update({
          where: { id: accountId },
          data: {
            balance: { increment: balanceDelta },
          },
        });
      }
    }

    const newTx = await prisma.engTransaction.create({
      data: {
        projectId,
        date: date || new Date().toISOString().slice(0, 10),
        description,
        type,
        expenditureCategory: type === "EXPENSE" ? expenditureCategory : undefined,
        amount: numAmount,
        accountId: accountId || "acc-001",
        accountName,
        isInternalSupply: Boolean(isInternalSupply),
        notes,
      },
    });

    return res.status(201).json(newTx);
  } catch (error) {
    console.error("createTransaction error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 4. FINANCIAL CALCULATIONS & SUMMARIES (GROSS PROFIT COMPUTED ON BACKEND)
// ---------------------------------------------------------------------------

export async function getProjectFinancialSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const { projectId } = req.params;
    const project = await prisma.engProject.findUnique({
      where: { id: projectId as string },
      include: { transactions: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const totalIncome = project.transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = project.transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    const grossProfit = totalIncome - totalExpense;
    const profitMarginPercentage = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

    return res.json({
      project,
      totalIncome,
      totalExpense,
      grossProfit,
      profitMarginPercentage,
      transactionCount: project.transactions.length,
    });
  } catch (error) {
    console.error("getProjectFinancialSummary error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllProjectsFinancialSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const { ownerId: queryOwnerId } = req.query as { ownerId?: string };
    const scopedOwnerId = getScopedOwnerId(req, queryOwnerId);

    const whereClause: any = {};
    if (scopedOwnerId && scopedOwnerId !== "ALL") {
      whereClause.ownerId = scopedOwnerId;
    }

    const projects = await prisma.engProject.findMany({
      where: whereClause,
      include: { transactions: true },
      orderBy: { createdAt: "desc" },
    });

    const summaries = projects.map((p) => {
      const totalIncome = p.transactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = p.transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + t.amount, 0);

      const grossProfit = totalIncome - totalExpense;
      const profitMarginPercentage = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

      return {
        project: p,
        totalIncome,
        totalExpense,
        grossProfit,
        profitMarginPercentage,
        transactionCount: p.transactions.length,
      };
    });

    return res.json(summaries);
  } catch (error) {
    console.error("getAllProjectsFinancialSummary error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPortfolioMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    const { ownerId: queryOwnerId } = req.query as { ownerId?: string };
    const scopedOwnerId = getScopedOwnerId(req, queryOwnerId);

    const whereClause: any = {};
    if (scopedOwnerId && scopedOwnerId !== "ALL") {
      whereClause.ownerId = scopedOwnerId;
    }

    const projects = await prisma.engProject.findMany({
      where: whereClause,
      include: { transactions: true },
    });

    let totalPortfolioIncome = 0;
    let totalPortfolioExpense = 0;

    const countByStatus: Record<string, number> = {
      QUOTED: 0,
      LPO_RECEIVED: 0,
      IN_PROGRESS: 0,
      INVOICED: 0,
      PAID: 0,
      COMPLETED: 0,
    };

    let activeProjectsCount = 0;

    for (const p of projects) {
      countByStatus[p.status] = (countByStatus[p.status] || 0) + 1;
      if (p.status === "IN_PROGRESS" || p.status === "LPO_RECEIVED" || p.status === "INVOICED") {
        activeProjectsCount++;
      }

      for (const t of p.transactions) {
        if (t.type === "INCOME") totalPortfolioIncome += t.amount;
        if (t.type === "EXPENSE") totalPortfolioExpense += t.amount;
      }
    }

    const totalPortfolioGrossProfit = totalPortfolioIncome - totalPortfolioExpense;

    return res.json({
      totalProjectsCount: projects.length,
      activeProjectsCount,
      totalPortfolioIncome,
      totalPortfolioExpense,
      totalPortfolioGrossProfit,
      countByStatus,
    });
  } catch (error) {
    console.error("getPortfolioMetrics error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
