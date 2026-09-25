import { Request, Response } from "express";
import { generateExcelBuffer, generatePdfBuffer, generateInvoicePdfBuffer, ExportColumn } from "../services/exportService.js";
import { prisma } from "../prisma.js";

/**
 * Helper to fetch data by entity type with filters if entity is specified
 */
async function fetchEntityDataWithFilters(
  entity: string,
  queryFilters: Record<string, any> = {}
): Promise<{ rows: Record<string, any>[]; filterSummaryParts: string[] }> {
  const { search, status, categoryId, startDate, endDate, role } = queryFilters;
  const filterSummaryParts: string[] = [];
  let rows: Record<string, any>[] = [];

  const where: any = {};

  if (search && typeof search === "string" && search.trim()) {
    filterSummaryParts.push(`Search: "${search.trim()}"`);
  }
  if (status && typeof status === "string" && status !== "ALL") {
    filterSummaryParts.push(`Status: ${status}`);
  }
  if (categoryId && typeof categoryId === "string" && categoryId !== "ALL") {
    filterSummaryParts.push(`Category Filtered`);
  }
  if (startDate || endDate) {
    filterSummaryParts.push(`Date: ${startDate || "Start"} to ${endDate || "End"}`);
  }

  switch (entity.toLowerCase()) {
    case "products": {
      if (categoryId && categoryId !== "ALL") where.categoryId = categoryId;
      if (status && status !== "ALL") where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ];
      }
      const data = await prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
      });
      rows = data.map((p) => ({
        code: p.code,
        name: p.name,
        category: p.category?.name || "N/A",
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
        status: p.status,
      }));
      break;
    }

    case "invoices": {
      if (status && status !== "ALL") where.status = status;
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { customerName: { contains: search, mode: "insensitive" } },
        ];
      }
      const data = await prisma.invoice.findMany({
        where,
        include: { items: true },
        orderBy: { date: "desc" },
      });
      rows = data.map((inv) => {
        const totalAmount = inv.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        return {
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          date: inv.date instanceof Date ? inv.date.toISOString().slice(0, 10) : String(inv.date).slice(0, 10),
          dueDate: inv.dueDate instanceof Date ? inv.dueDate.toISOString().slice(0, 10) : String(inv.dueDate).slice(0, 10),
          amount: totalAmount,
          status: inv.status,
        };
      });
      break;
    }

    case "transactions": {
      if (status && status !== "ALL") where.type = status;
      if (search) {
        where.OR = [
          { description: { contains: search, mode: "insensitive" } },
          { reference: { contains: search, mode: "insensitive" } },
        ];
      }
      const [data, accounts, expCodes] = await Promise.all([
        prisma.financeTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
        }),
        prisma.financeAccount.findMany(),
        prisma.expenditureCode.findMany(),
      ]);

      const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
      const codeMap = new Map(expCodes.map((c) => [c.id, c.code]));

      rows = data.map((tx) => ({
        date: typeof tx.date === "string" ? tx.date.slice(0, 10) : "N/A",
        description: tx.description,
        type: tx.type,
        sourceAccount: accountMap.get(tx.sourceAccountId) || "N/A",
        destinationAccount: tx.destinationAccountId ? accountMap.get(tx.destinationAccountId) || "—" : "—",
        amount: tx.amount,
        expenditureCode: tx.expenditureCodeId ? codeMap.get(tx.expenditureCodeId) || "N/A" : "N/A",
        reference: tx.reference || "—",
      }));
      break;
    }

    case "users": {
      if (role && role !== "ALL") where.role = role;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      const data = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      rows = data.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.active ? "ACTIVE" : "INACTIVE",
      }));
      break;
    }

    case "tasks": {
      if (status && status !== "ALL") where.status = status;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }
      const data = await prisma.task.findMany({
        where,
        include: { assignee: true },
        orderBy: { updatedAt: "desc" },
      });
      rows = data.map((t) => ({
        title: t.title,
        department: t.department,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee?.name || "Unassigned",
        dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString().slice(0, 10) : String(t.dueDate).slice(0, 10),
      }));
      break;
    }

    default:
      break;
  }

  return { rows, filterSummaryParts };
}

/**
 * POST /api/export/excel
 */
export async function exportExcel(req: Request, res: Response) {
  try {
    let { title, filename, columns, rows, filterSummary, entity, queryFilters } = req.body;

    title = (title || "Data Export").replace(/\.(csv|xlsx|pdf)$/i, "");
    filename = (filename || title || "kaizen_export")
      .toLowerCase()
      .replace(/\.(csv|xlsx|pdf)$/i, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");

    // If entity is provided, try fetching filtered rows from database
    if (entity && (!rows || rows.length === 0)) {
      const result = await fetchEntityDataWithFilters(entity, queryFilters);
      rows = result.rows;
      if (result.filterSummaryParts.length > 0 && !filterSummary) {
        filterSummary = result.filterSummaryParts.join(" | ");
      }
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: "Columns definition is required for export" });
    }

    if (!rows || !Array.isArray(rows)) {
      rows = [];
    }

    const buffer = await generateExcelBuffer({
      title,
      filterSummary,
      columns,
      rows,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error("Error generating Excel export:", error);
    return res.status(500).json({ error: "Failed to generate Excel export" });
  }
}

/**
 * POST /api/export/pdf
 */
export async function exportPdf(req: Request, res: Response) {
  try {
    let { title, filename, columns, rows, filterSummary, entity, queryFilters } = req.body;

    title = (title || "Data Export").replace(/\.(csv|xlsx|pdf)$/i, "");
    filename = (filename || title || "kaizen_export")
      .toLowerCase()
      .replace(/\.(csv|xlsx|pdf)$/i, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");

    // If entity is provided, try fetching filtered rows from database
    if (entity && (!rows || rows.length === 0)) {
      const result = await fetchEntityDataWithFilters(entity, queryFilters);
      rows = result.rows;
      if (result.filterSummaryParts.length > 0 && !filterSummary) {
        filterSummary = result.filterSummaryParts.join(" | ");
      }
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: "Columns definition is required for export" });
    }

    if (!rows || !Array.isArray(rows)) {
      rows = [];
    }

    const buffer = await generatePdfBuffer({
      title,
      filterSummary,
      columns,
      rows,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    console.error("Error generating PDF export:", error);
    return res.status(500).json({ error: "Failed to generate PDF export" });
  }
}

/**
 * POST /api/export/invoice-pdf
 */
export async function exportInvoicePdf(req: Request, res: Response) {
  try {
    const payload = req.body;
    const buffer = await generateInvoicePdfBuffer(payload);
    const rawNumber = String(payload.docNumber || "invoice").replace(/[^a-z0-9_]/gi, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="invoice_${rawNumber}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    console.error("Error generating Invoice PDF:", error);
    return res.status(500).json({ error: "Failed to generate Invoice PDF" });
  }
}
