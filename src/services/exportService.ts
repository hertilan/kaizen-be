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
  const { title, subtitle, filterSummary, columns, rows } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kaizen SaaS Portal";
  workbook.created = new Date();

  const sheetName = title.replace(/[\\/?*:[\]]/g, "").slice(0, 30) || "Export";
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
  const titleRow = worksheet.addRow([title.toUpperCase()]);
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
 * Generate PDF document buffer using PDFKit with system styling and embedded Logo
 */
export async function generatePdfBuffer(options: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { title, subtitle, filterSummary, columns, rows } = options;

      // Use landscape if > 5 columns, else portrait
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

      // HEADER RENDERING FUNCTION FOR EVERY PAGE
      const renderHeader = (pageNumber: number) => {
        // Top banner background
        doc.rect(0, 0, pageWidth, 60).fill(COLORS.primaryPdf);

        // Logo
        if (logoPath) {
          try {
            doc.image(logoPath, pageMargin, 10, { height: 40 });
          } catch (e) {
            // Fallback text if logo load fails
            doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold").text("KAIZEN", pageMargin, 18);
          }
        } else {
          doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold").text("KAIZEN", pageMargin, 18);
        }

        // Top right banner title
        doc
          .fillColor("#FFFFFF")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(title.toUpperCase(), pageMargin, 20, {
            width: printableWidth,
            align: "right",
          });

        // Subheader metadata block below top banner
        doc.fillColor(COLORS.textPdf);
        let startY = 70;

        doc.fontSize(14).font("Helvetica-Bold").text(title, pageMargin, startY);
        startY += 18;

        doc.fontSize(8).font("Helvetica-Oblique").fillColor(COLORS.textMutedPdf);
        let metaStr = `Generated: ${new Date().toLocaleString()} | Total Records: ${rows.length}`;
        if (filterSummary) {
          metaStr += ` | Filters: ${filterSummary}`;
        }
        doc.text(metaStr, pageMargin, startY);
        startY += 14;

        // Thin divider line
        doc
          .moveTo(pageMargin, startY)
          .lineTo(pageWidth - pageMargin, startY)
          .strokeColor(COLORS.borderPdf)
          .lineWidth(1)
          .stroke();

        return startY + 8;
      };

      let currentY = renderHeader(1);

      // TABLE COLUMN WIDTH CALCULATIONS
      const minColWidth = 50;
      const colWidths: number[] = columns.map((col) => {
        if (col.width) return col.width;
        return Math.max(minColWidth, Math.floor(printableWidth / columns.length));
      });

      // Normalize column widths to fit exactly printableWidth
      const sumWidths = colWidths.reduce((a, b) => a + b, 0);
      const scaleFactor = printableWidth / sumWidths;
      const finalWidths = colWidths.map((w) => Math.floor(w * scaleFactor));

      const rowHeight = 22;
      const tableHeaderHeight = 24;

      // FUNCTION TO RENDER TABLE HEADERS
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

      // RENDER TABLE ROWS
      rows.forEach((row, rowIndex) => {
        // Check if row fits on current page (leave 40pt for footer)
        if (currentY + rowHeight > pageHeight - 50) {
          doc.addPage();
          currentY = renderHeader(doc.bufferedPageRange().count);
          currentY = renderTableHeader(currentY);
        }

        const isOdd = rowIndex % 2 === 1;
        const rowBg = isOdd ? COLORS.zebraOddPdf : COLORS.zebraEvenPdf;

        // Background row rect
        doc.rect(pageMargin, currentY, printableWidth, rowHeight).fill(rowBg);

        // Row borders
        doc
          .moveTo(pageMargin, currentY + rowHeight)
          .lineTo(pageWidth - pageMargin, currentY + rowHeight)
          .strokeColor(COLORS.borderPdf)
          .lineWidth(0.5)
          .stroke();

        let currentX = pageMargin;
        columns.forEach((col, idx) => {
          const w = finalWidths[idx];
          const rawVal = row[col.key];
          let displayVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : "";

          // Format numbers
          if (typeof rawVal === "number") {
            displayVal = Number.isInteger(rawVal)
              ? rawVal.toLocaleString()
              : rawVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }

          doc
            .fillColor(COLORS.textPdf)
            .fontSize(8)
            .font("Helvetica")
            .text(displayVal, currentX + 4, currentY + 6, {
              width: w - 8,
              align: col.align || "left",
              lineBreak: false,
              ellipsis: true,
            });

          currentX += w;
        });

        currentY += rowHeight;
      });

      // FOOTER FOR ALL PAGES
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Footer top rule
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
          .text("Kaizen Management System — Confidential & Proprietary Report", pageMargin, pageHeight - 24);

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
