import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export interface ExportColumn {
  header: string;
  key: string;
  align?: "left" | "center" | "right";
  width?: number;
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  filterSummary?: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  filename?: string;
}

// System color palette (matching Kaizen FE design system)
const COLORS = {
  primaryHex: "0000FE",
  primaryPdf: "#0000FE",
  primaryDarkHex: "0000C8",
  primaryDarkPdf: "#0000C8",
  secondaryHex: "01FFFF",
  secondaryPdf: "#01FFFF",
  textHex: "0F172A",
  textPdf: "#0F172A",
  textMutedHex: "64748B",
  textMutedPdf: "#64748B",
  borderHex: "DBE3EE",
  borderPdf: "#DBE3EE",
  zebraEvenHex: "FFFFFF",
  zebraEvenPdf: "#FFFFFF",
  zebraOddHex: "F8FAFC",
  zebraOddPdf: "#F8FAFC",
};

/**
 * Generate Excel file buffer using ExcelJS with system colors and formatting
 */
export async function generateExcelBuffer(options: ExportOptions): Promise<Buffer> {
  const { title, filterSummary, columns, rows } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kaizen SaaS Portal";
  workbook.created = new Date();

  const cleanTitle = title.replace(/\.(csv|xlsx|pdf)$/i, "");
  const sheetName = cleanTitle.replace(/[\\/?*:[\]]/g, "").slice(0, 30) || "Export";
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  const totalCols = Math.max(columns.length, 1);

  // 1. Primary Header Banner Row (Row 1)
  const headerRow = worksheet.addRow(["KAIZEN SYSTEM"]);
  worksheet.mergeCells(1, 1, 1, totalCols);
  headerRow.height = 36;
  const headerCell = headerRow.getCell(1);
  headerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF" + COLORS.primaryHex },
  };
  headerCell.font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  headerCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  // 2. Report Title & Subtitle (Row 2 & 3)
  const titleRow = worksheet.addRow([cleanTitle.toUpperCase()]);
  worksheet.mergeCells(2, 1, 2, totalCols);
  titleRow.height = 24;
  const titleCell = titleRow.getCell(1);
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + COLORS.textHex } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const metaText = `Generated: ${new Date().toLocaleString()} ${
    filterSummary ? ` | Filters: ${filterSummary}` : ""
  } | Records: ${rows.length}`;
  const metaRow = worksheet.addRow([metaText]);
  worksheet.mergeCells(3, 1, 3, totalCols);
  metaRow.height = 20;
  const metaCell = metaRow.getCell(1);
  metaCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF" + COLORS.textMutedHex } };
  metaCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  // Empty spacing row (Row 4)
  worksheet.addRow([]);

  // 3. Table Column Headers (Row 5)
  const colHeaders = columns.map((c) => c.header);
  const tableHeaderRow = worksheet.addRow(colHeaders);
  tableHeaderRow.height = 28;

  tableHeaderRow.eachCell((cell, colNumber) => {
    const colDef = columns[colNumber - 1];
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + COLORS.primaryHex },
    };
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: colDef?.align || "left",
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF" + COLORS.primaryDarkHex } },
      bottom: { style: "medium", color: { argb: "FF" + COLORS.primaryDarkHex } },
      left: { style: "thin", color: { argb: "FF" + COLORS.borderHex } },
      right: { style: "thin", color: { argb: "FF" + COLORS.borderHex } },
    };
  });

  // 4. Data Rows
  rows.forEach((row, rowIndex) => {
    const rowValues = columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return "";
      return val;
    });

    const dataRow = worksheet.addRow(rowValues);
    dataRow.height = 22;
    const isOdd = rowIndex % 2 === 1;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      const align = colDef?.align || "left";

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + (isOdd ? COLORS.zebraOddHex : COLORS.zebraEvenHex) },
      };
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF" + COLORS.textHex } };
      cell.alignment = { vertical: "middle", horizontal: align };

      cell.border = {
        top: { style: "thin", color: { argb: "FF" + COLORS.borderHex } },
        bottom: { style: "thin", color: { argb: "FF" + COLORS.borderHex } },
        left: { style: "thin", color: { argb: "FF" + COLORS.borderHex } },
        right: { style: "thin", color: { argb: "FF" + COLORS.borderHex } },
      };

      // Number / Currency formatting
      const rawVal = cell.value;
      if (typeof rawVal === "number") {
        if (Number.isInteger(rawVal)) {
          cell.numFmt = "#,##0";
        } else {
          cell.numFmt = "#,##0.00";
        }
      }
    });
  });

  // 5. Auto-adjust column widths
  worksheet.columns.forEach((col, idx) => {
    const colDef = columns[idx];
    let maxLen = colDef?.header?.length || 10;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum >= 5) {
        const val = row.getCell(idx + 1).value;
        if (val !== null && val !== undefined) {
          const str = String(val);
          if (str.length > maxLen) maxLen = str.length;
        }
      }
    });

    col.width = Math.min(Math.max(maxLen + 4, 12), 45);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Helper to locate Kaizen logo file
 */
function getLogoPath(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), "src", "assets", "logo_horizontal.png"),
    path.join(process.cwd(), "src", "assets", "logo.png"),
    path.join(process.cwd(), "dist", "assets", "logo.png"),
    path.join(process.cwd(), "..", "kaizen-fe", "public", "logo_horizontal.png"),
    path.join(process.cwd(), "..", "kaizen-fe", "public", "logo_kaizen.png"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Generate PDF document buffer using PDFKit with clean white header, logo, dynamic row heights, and no blank pages
 */
export async function generatePdfBuffer(options: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { title, filterSummary, columns, rows } = options;

      const cleanTitle = title.replace(/\.(csv|xlsx|pdf)$/i, "");
      const isLandscape = columns.length > 5;
      const pageMargin = 36;

      const doc = new PDFDocument({
        size: "A4",
        layout: isLandscape ? "landscape" : "portrait",
        margin: pageMargin,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const printableWidth = pageWidth - pageMargin * 2;

      const logoPath = getLogoPath();

      // CLEAN HEADER WITHOUT SOLID DARK BLUE BANNER SO LOGO IS CRISP AND CLEARLY VISIBLE
      const renderHeader = (pageNumber: number) => {
        let headerY = pageMargin;

        // Top Accent Line in Primary Brand Blue
        doc
          .moveTo(pageMargin, headerY)
          .lineTo(pageWidth - pageMargin, headerY)
          .strokeColor(COLORS.primaryPdf)
          .lineWidth(3)
          .stroke();

        headerY += 10;

        // Kaizen Logo on top left (on clean white background)
        let logoBottomY = headerY;
        if (logoPath) {
          try {
            doc.image(logoPath, pageMargin, headerY, { height: 38 });
            logoBottomY = headerY + 38;
          } catch (e) {
            doc.fillColor(COLORS.primaryPdf).fontSize(20).font("Helvetica-Bold").text("KAIZEN", pageMargin, headerY);
            logoBottomY = headerY + 24;
          }
        } else {
          doc.fillColor(COLORS.primaryPdf).fontSize(20).font("Helvetica-Bold").text("KAIZEN", pageMargin, headerY);
          logoBottomY = headerY + 24;
        }

        // Clean Report Title on top right
        const titleText = (cleanTitle || "REPORT").toUpperCase();
        doc
          .fillColor(COLORS.textPdf)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(titleText, pageMargin, headerY + 4, {
            width: printableWidth,
            align: "right",
          });

        headerY = Math.max(logoBottomY, headerY + 28) + 6;

        // Subheader metadata line
        doc.fontSize(8.5).font("Helvetica-Oblique").fillColor(COLORS.textMutedPdf);
        let metaStr = `Generated: ${new Date().toLocaleString()} | Total Records: ${rows.length}`;
        if (filterSummary) {
          metaStr += ` | Filters: ${filterSummary}`;
        }
        doc.text(metaStr, pageMargin, headerY);
        headerY += 14;

        // Divider line below header
        doc
          .moveTo(pageMargin, headerY)
          .lineTo(pageWidth - pageMargin, headerY)
          .strokeColor(COLORS.borderPdf)
          .lineWidth(0.75)
          .stroke();

        return headerY + 10;
      };

      let currentY = renderHeader(1);

      // TABLE COLUMN WIDTH CALCULATIONS
      const minColWidth = 45;
      const colWidths: number[] = columns.map((col) => {
        if (col.width) return col.width;
        return Math.max(minColWidth, Math.floor(printableWidth / columns.length));
      });

      const sumWidths = colWidths.reduce((a, b) => a + b, 0);
      const scaleFactor = printableWidth / sumWidths;
      const finalWidths = colWidths.map((w) => Math.floor(w * scaleFactor));

      const tableHeaderHeight = 24;

      const renderTableHeader = (y: number) => {
        doc.rect(pageMargin, y, printableWidth, tableHeaderHeight).fill(COLORS.primaryPdf);

        let currentX = pageMargin;
        columns.forEach((col, idx) => {
          const w = finalWidths[idx];
          doc
            .fillColor("#FFFFFF")
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(col.header, currentX + 4, y + 6, {
              width: w - 8,
              align: col.align || "left",
              lineBreak: false,
            });
          currentX += w;
        });

        return y + tableHeaderHeight;
      };

      currentY = renderTableHeader(currentY);

      const formatValue = (rawVal: any): string => {
        if (rawVal === undefined || rawVal === null) return "";
        if (typeof rawVal === "number") {
          return Number.isInteger(rawVal)
            ? rawVal.toLocaleString()
            : rawVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return String(rawVal);
      };

      // RENDER TABLE ROWS WITH DYNAMIC ROW HEIGHT & TEXT WRAPPING
      rows.forEach((row, rowIndex) => {
        // 1. Calculate required height for every cell in this row based on multiline text wrapping
        let maxTextHeight = 12;
        columns.forEach((col, idx) => {
          const w = finalWidths[idx];
          const textStr = formatValue(row[col.key]);
          if (textStr) {
            doc.font("Helvetica").fontSize(8);
            const h = doc.heightOfString(textStr, {
              width: w - 8,
            });
            if (h > maxTextHeight) {
              maxTextHeight = h;
            }
          }
        });

        const calculatedRowHeight = Math.max(22, Math.ceil(maxTextHeight + 10));

        // 2. Check if row fits on current page (leave 40pt for page footer)
        if (currentY + calculatedRowHeight > pageHeight - 45) {
          doc.addPage();
          currentY = renderHeader(doc.bufferedPageRange().count);
          currentY = renderTableHeader(currentY);
        }

        const isOdd = rowIndex % 2 === 1;
        const rowBg = isOdd ? COLORS.zebraOddPdf : COLORS.zebraEvenPdf;

        // Background row rect
        doc.rect(pageMargin, currentY, printableWidth, calculatedRowHeight).fill(rowBg);

        // Bottom border line for row
        doc
          .moveTo(pageMargin, currentY + calculatedRowHeight)
          .lineTo(pageWidth - pageMargin, currentY + calculatedRowHeight)
          .strokeColor(COLORS.borderPdf)
          .lineWidth(0.5)
          .stroke();

        // Write cell contents with lineBreak: true to enable clean wrapping without text intersection
        let currentX = pageMargin;
        columns.forEach((col, idx) => {
          const w = finalWidths[idx];
          const displayVal = formatValue(row[col.key]);

          doc
            .fillColor(COLORS.textPdf)
            .fontSize(8)
            .font("Helvetica")
            .text(displayVal, currentX + 4, currentY + 5, {
              width: w - 8,
              align: col.align || "left",
              lineBreak: true,
            });

          currentX += w;
        });

        currentY += calculatedRowHeight;
      });

      // FOOTER FOR ALL GENERATED PAGES
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        doc
          .moveTo(pageMargin, pageHeight - 32)
          .lineTo(pageWidth - pageMargin, pageHeight - 32)
          .strokeColor(COLORS.borderPdf)
          .lineWidth(0.5)
          .stroke();

        doc
          .fillColor(COLORS.textMutedPdf)
          .fontSize(8)
          .font("Helvetica")
          .text("Kaizen Management System — Confidential Report", pageMargin, pageHeight - 24);

        doc.text(
          `Page ${i + 1} of ${range.count}`,
          pageMargin,
          pageHeight - 24,
          { width: printableWidth, align: "right" }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export interface InvoiceItemPayload {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoicePdfOptions {
  docNumber: string;
  docTitle?: string;
  date: string;
  dueDate?: string;
  from: {
    name: string;
    details?: string;
  };
  billTo: {
    name: string;
    details?: string;
  };
  items: InvoiceItemPayload[];
  totalAmount: number;
  amountPaid?: number;
  amountOwed?: number;
  status?: string;
  notes?: string;
}

/**
 * Generate Invoice PDF Document buffer matching the designer layout specification
 */
export async function generateInvoicePdfBuffer(options: InvoicePdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const {
        docNumber,
        docTitle = "INVOICE",
        date,
        dueDate,
        from,
        billTo,
        items,
        totalAmount,
        amountPaid,
        amountOwed,
        status,
        notes,
      } = options;

      const pageMargin = 40;
      const doc = new PDFDocument({
        size: "A4",
        layout: "portrait",
        margin: pageMargin,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const printableWidth = pageWidth - pageMargin * 2;

      let currentY = pageMargin;

      // Top Accent Line
      doc
        .moveTo(pageMargin, currentY)
        .lineTo(pageWidth - pageMargin, currentY)
        .strokeColor(COLORS.primaryPdf)
        .lineWidth(3)
        .stroke();

      currentY += 14;

      // HEADER: Title on Left, Document Number & Date on Right
      const headerTopY = currentY;

      doc
        .fillColor(COLORS.primaryPdf)
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(docTitle.toUpperCase(), pageMargin, headerTopY);

      doc
        .fillColor(COLORS.textMutedPdf)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("OFFICIAL TAX DOCUMENT", pageMargin, headerTopY + 28);

      doc
        .fillColor(COLORS.primaryPdf)
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(`#${docNumber}`, pageMargin, headerTopY, {
          width: printableWidth,
          align: "right",
        });

      let rightY = headerTopY + 22;
      doc
        .fillColor(COLORS.textMutedPdf)
        .fontSize(9)
        .font("Helvetica")
        .text(`Date: ${date}`, pageMargin, rightY, {
          width: printableWidth,
          align: "right",
        });

      if (dueDate) {
        rightY += 12;
        doc.text(`Due Date: ${dueDate}`, pageMargin, rightY, {
          width: printableWidth,
          align: "right",
        });
      }

      currentY = Math.max(headerTopY + 44, rightY + 16);

      // Divider Line
      doc
        .moveTo(pageMargin, currentY)
        .lineTo(pageWidth - pageMargin, currentY)
        .strokeColor(COLORS.borderPdf)
        .lineWidth(0.75)
        .stroke();

      currentY += 16;

      // TWO-COLUMN ADDRESS GRID (FROM & BILL TO)
      const colWidth = Math.floor((printableWidth - 30) / 2);

      // Column 1: FROM
      doc
        .fillColor(COLORS.primaryPdf)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("FROM", pageMargin, currentY);

      let fromY = currentY + 12;
      doc
        .fillColor(COLORS.textPdf)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(from.name, pageMargin, fromY, { width: colWidth });

      if (from.details) {
        fromY += doc.heightOfString(from.name, { width: colWidth }) + 4;
        doc
          .fillColor(COLORS.textMutedPdf)
          .fontSize(8.5)
          .font("Helvetica")
          .text(from.details, pageMargin, fromY, { width: colWidth, lineGap: 2 });
        fromY += doc.heightOfString(from.details, { width: colWidth, lineGap: 2 });
      }

      // Column 2: BILL TO
      const col2X = pageMargin + colWidth + 30;
      doc
        .fillColor(COLORS.primaryPdf)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("BILL TO", col2X, currentY);

      let billToY = currentY + 12;
      doc
        .fillColor(COLORS.textPdf)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(billTo.name, col2X, billToY, { width: colWidth });

      if (billTo.details) {
        billToY += doc.heightOfString(billTo.name, { width: colWidth }) + 4;
        doc
          .fillColor(COLORS.textMutedPdf)
          .fontSize(8.5)
          .font("Helvetica")
          .text(billTo.details, col2X, billToY, { width: colWidth, lineGap: 2 });
        billToY += doc.heightOfString(billTo.details, { width: colWidth, lineGap: 2 });
      }

      currentY = Math.max(fromY, billToY) + 20;

      // ITEMS TABLE
      const col1W = Math.floor(printableWidth * 0.45);
      const col2W = Math.floor(printableWidth * 0.12);
      const col3W = Math.floor(printableWidth * 0.21);
      const col4W = printableWidth - col1W - col2W - col3W;

      doc
        .moveTo(pageMargin, currentY)
        .lineTo(pageWidth - pageMargin, currentY)
        .strokeColor(COLORS.primaryPdf)
        .lineWidth(2)
        .stroke();

      currentY += 6;

      doc.fillColor(COLORS.primaryPdf).fontSize(9).font("Helvetica-Bold");
      doc.text("DESCRIPTION", pageMargin + 4, currentY, { width: col1W - 8 });
      doc.text("QTY", pageMargin + col1W + 4, currentY, { width: col2W - 8, align: "center" });
      doc.text("RATE (RWF)", pageMargin + col1W + col2W + 4, currentY, { width: col3W - 8, align: "right" });
      doc.text("AMOUNT (RWF)", pageMargin + col1W + col2W + col3W + 4, currentY, { width: col4W - 8, align: "right" });

      currentY += 16;

      doc
        .moveTo(pageMargin, currentY)
        .lineTo(pageWidth - pageMargin, currentY)
        .strokeColor(COLORS.primaryPdf)
        .lineWidth(2)
        .stroke();

      currentY += 4;

      items.forEach((item, idx) => {
        const itemDesc = item.description;
        doc.font("Helvetica").fontSize(8.5);
        const descHeight = doc.heightOfString(itemDesc, { width: col1W - 8 });
        const rowHeight = Math.max(22, Math.ceil(descHeight + 8));

        if (idx % 2 === 1) {
          doc.rect(pageMargin, currentY, printableWidth, rowHeight).fill(COLORS.zebraOddPdf);
        }

        doc
          .fillColor(COLORS.textPdf)
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(itemDesc, pageMargin + 4, currentY + 4, { width: col1W - 8 });

        doc
          .font("Helvetica")
          .text(String(item.quantity), pageMargin + col1W + 4, currentY + 4, {
            width: col2W - 8,
            align: "center",
          });

        doc.text(
          item.unitPrice.toLocaleString(),
          pageMargin + col1W + col2W + 4,
          currentY + 4,
          { width: col3W - 8, align: "right" }
        );

        doc.font("Helvetica-Bold").text(
          (item.amount || item.quantity * item.unitPrice).toLocaleString(),
          pageMargin + col1W + col2W + col3W + 4,
          currentY + 4,
          { width: col4W - 8, align: "right" }
        );

        doc
          .moveTo(pageMargin, currentY + rowHeight)
          .lineTo(pageWidth - pageMargin, currentY + rowHeight)
          .strokeColor(COLORS.borderPdf)
          .lineWidth(0.5)
          .stroke();

        currentY += rowHeight;
      });

      currentY += 14;

      // FULL-WIDTH SOLID TOTAL BANNER IN KAIZEN PRIMARY BLUE
      const bannerHeight = 36;
      doc.rect(pageMargin, currentY, printableWidth, bannerHeight).fill(COLORS.primaryPdf);

      doc
        .fillColor("#FFFFFF")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("GRAND TOTAL", pageMargin + 14, currentY + 11);

      doc
        .fillColor("#FFFFFF")
        .fontSize(15)
        .font("Helvetica-Bold")
        .text(`RWF ${totalAmount.toLocaleString()}`, pageMargin, currentY + 10, {
          width: printableWidth - 14,
          align: "right",
        });

      currentY += bannerHeight + 16;

      if (amountPaid !== undefined || amountOwed !== undefined || status) {
        doc.fontSize(8.5).font("Helvetica");

        if (status) {
          doc.fillColor(COLORS.textMutedPdf).text(`Payment Status: ${status}`, pageMargin, currentY);
        }

        let summaryY = currentY;
        if (amountPaid !== undefined) {
          doc.fillColor(COLORS.textPdf).text(
            `Amount Paid: RWF ${amountPaid.toLocaleString()}`,
            pageMargin,
            summaryY,
            { width: printableWidth, align: "right" }
          );
          summaryY += 12;
        }

        if (amountOwed !== undefined && amountOwed > 0) {
          doc.fillColor("#EF4444").font("Helvetica-Bold").text(
            `Balance Due: RWF ${amountOwed.toLocaleString()}`,
            pageMargin,
            summaryY,
            { width: printableWidth, align: "right" }
          );
          summaryY += 12;
        }

        currentY = Math.max(currentY + 24, summaryY + 10);
      }

      if (notes) {
        doc
          .fillColor(COLORS.textMutedPdf)
          .fontSize(8.5)
          .font("Helvetica-Oblique")
          .text(`Notes: ${notes}`, pageMargin, currentY, { width: printableWidth });
      }

      // FOOTER
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        doc
          .moveTo(pageMargin, pageHeight - 32)
          .lineTo(pageWidth - pageMargin, pageHeight - 32)
          .strokeColor(COLORS.borderPdf)
          .lineWidth(0.5)
          .stroke();

        doc
          .fillColor(COLORS.textMutedPdf)
          .fontSize(8)
          .font("Helvetica")
          .text(
            "Thank you for your business — Kaizen General Services & Trading Ltd",
            pageMargin,
            pageHeight - 24
          );

        doc.text(`Page ${i + 1} of ${range.count}`, pageMargin, pageHeight - 24, {
          width: printableWidth,
          align: "right",
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
