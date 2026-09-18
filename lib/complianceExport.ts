import PDFDocument from "pdfkit";
import { prisma } from "./prisma";
import { formatCents } from "./format";

const MARGIN = 50;
const PAGE_WIDTH = 612; // US Letter, points
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function periodBounds(period: string): { start: Date; end: Date } {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
  return { start, end };
}

type PdfDoc = InstanceType<typeof PDFDocument>;

function drawSectionHeading(doc: PdfDoc, title: string) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text(title);
  doc.moveTo(MARGIN, doc.y + 2).lineTo(PAGE_WIDTH - MARGIN, doc.y + 2).strokeColor("#d4d4d8").stroke();
  doc.moveDown(0.6);
  doc.fillColor("#000000");
}

function drawTable(doc: PdfDoc, headers: string[], widths: number[], rows: string[][]) {
  const x0 = MARGIN;

  function drawHeaderRow() {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#3f3f46");
    let x = x0;
    const y = doc.y;
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: widths[i] - 4 });
      x += widths[i];
    });
    doc.moveDown(0.9);
    doc.moveTo(x0, doc.y).lineTo(x0 + widths.reduce((a, b) => a + b, 0), doc.y).strokeColor("#e4e4e7").stroke();
    doc.moveDown(0.3);
    doc.fillColor("#000000");
  }

  drawHeaderRow();

  for (const row of rows) {
    doc.font("Helvetica").fontSize(8);
    const heights = row.map((cell, i) => doc.heightOfString(cell || "—", { width: widths[i] - 4 }));
    const rowHeight = Math.max(...heights, 10) + 4;

    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeaderRow();
    }

    let x = x0;
    const y = doc.y;
    row.forEach((cell, i) => {
      doc.text(cell || "—", x, y, { width: widths[i] - 4 });
      x += widths[i];
    });
    doc.y = y + rowHeight;
  }
}

export async function buildEvidencePackPdf(companyId: string, period: string): Promise<Buffer> {
  const { start, end } = periodBounds(period);

  const [closePeriod, matches, auditEntries, glEntryCount, policyRules] = await Promise.all([
    prisma.closePeriod.findFirst({ where: { companyId, period }, include: { closedBy: true } }),
    prisma.match.findMany({
      where: { companyId, bankTransaction: { date: { startsWith: period } } },
      include: { bankTransaction: true, glEntry: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLogEntry.findMany({
      where: { companyId, timestamp: { gte: start, lt: end } },
      include: { actor: true },
      orderBy: { timestamp: "asc" },
    }),
    prisma.gLEntry.count({ where: { companyId, date: { startsWith: period } } }),
    prisma.policyRule.findMany({ where: { companyId, isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const resolvedCount = matches.filter((m) => m.status === "approved" || m.status === "auto_approved").length;
  const reconciliationRate = matches.length === 0 ? 0 : (resolvedCount / matches.length) * 100;

  const doc = new PDFDocument({ margin: MARGIN, size: "LETTER", bufferPages: true });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Cover / summary
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#0f172a").text("Ledgerly");
  doc.font("Helvetica").fontSize(11).fillColor("#52525b").text("Compliance Evidence Pack");
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#000000").text(formatPeriodLabel(period));
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(10).fillColor("#000000");
  doc.text(`Status: ${closePeriod?.status === "closed" ? "Closed" : "Open"}`);
  if (closePeriod?.status === "closed") {
    doc.text(
      `Closed by: ${closePeriod.closedBy?.email ?? "unknown"} on ${closePeriod.closedAt?.toLocaleString() ?? "unknown"}`
    );
  }
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").fontSize(11).text("Summary");
  doc.font("Helvetica").fontSize(10);
  doc.text(`Matches: ${matches.length} (${resolvedCount} approved, ${reconciliationRate.toFixed(1)}% reconciled)`);
  doc.text(`GL entries dated in period: ${glEntryCount}`);
  doc.text(`Audit log entries in period: ${auditEntries.length}`);

  // Matches table
  drawSectionHeading(doc, "Matches");
  if (matches.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor("#71717a").text("No matches dated in this period.");
    doc.fillColor("#000000");
  } else {
    drawTable(
      doc,
      ["Date", "Bank Txn", "GL Entry", "Type", "Conf.", "Status", "Reason"],
      [50, 90, 130, 55, 40, 65, CONTENT_WIDTH - 50 - 90 - 130 - 55 - 40 - 65],
      matches.map((m) => [
        m.bankTransaction.date,
        `${formatCents(m.bankTransaction.amountCents)} · ${m.bankTransaction.memo}`,
        m.glEntry ? `${m.glEntry.accountCode} · ${m.glEntry.description}` : "—",
        m.matchType,
        m.confidenceScore !== null ? `${Math.round(m.confidenceScore * 100)}%` : "—",
        m.status,
        m.reviewReason ?? "",
      ])
    );
  }

  // Audit log table
  drawSectionHeading(doc, "Audit Log");
  if (auditEntries.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor("#71717a").text("No audit log entries in this period.");
    doc.fillColor("#000000");
  } else {
    drawTable(
      doc,
      ["Timestamp", "Action", "Entity", "Actor"],
      [110, 140, 140, CONTENT_WIDTH - 110 - 140 - 140],
      auditEntries.map((e) => [
        e.timestamp.toLocaleString(),
        e.action,
        `${e.entityType} · ${e.entityId.slice(0, 8)}`,
        e.actor?.email ?? "system",
      ])
    );
  }

  // Policy rules snapshot
  drawSectionHeading(doc, "Active Policy Rules (as of export time)");
  if (policyRules.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor("#71717a").text("No active policy rules.");
    doc.fillColor("#000000");
  } else {
    drawTable(
      doc,
      ["Name", "Type", "Severity", "Scope"],
      [140, 130, 70, CONTENT_WIDTH - 140 - 130 - 70],
      policyRules.map((r) => [
        r.name,
        r.ruleType,
        r.severity,
        r.fundCode ? `Fund ${r.fundCode}` : "All funds",
      ])
    );
  }

  doc.end();
  return done;
}
