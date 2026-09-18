import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "../../../lib/prisma";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";
import { parseCsvString } from "../../../lib/adapters/csvAdapter";
import { parseJsonString } from "../../../lib/adapters/jsonAdapter";
import { parseBai2String } from "../../../lib/adapters/bai2Adapter";
import { runExactMatchPass, runFuzzyMatchPass } from "../../../lib/matchEngine";
import { periodFromDate, getClosedPeriodsAmong } from "../../../lib/closePeriod";
import { runPositivePayPass } from "../../../lib/positivePay";
import { detectAnomalies } from "../../../lib/anomalyDetection";

type Format = "csv" | "json" | "bai2";

function detectFormat(filename: string): Format | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".bai2") || lower.endsWith(".txt")) return "bai2";
  return null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const formatOverride = formData.get("format");
  const mode = formData.get("mode") === "preview" ? "preview" : "commit";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const format =
    typeof formatOverride === "string" && formatOverride
      ? (formatOverride as Format)
      : detectFormat(file.name);

  if (!format) {
    return NextResponse.json(
      { error: "Could not determine file format. Use a .csv, .json, or .bai2/.txt file, or pick a format explicitly." },
      { status: 400 }
    );
  }

  const content = await file.text();
  const contentHash = createHash("sha256").update(content).digest("hex");

  let parsed;
  try {
    if (format === "csv") parsed = parseCsvString(content);
    else if (format === "json") parsed = parseJsonString(content);
    else parsed = parseBai2String(content);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse file as ${format}: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 400 }
    );
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No transactions found in file" }, { status: 400 });
  }

  if (mode === "preview") {
    return NextResponse.json({ preview: parsed });
  }

  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot upload files" }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const existingBatch = await prisma.uploadBatch.findFirst({ where: { companyId, contentHash } });
  if (existingBatch) {
    return NextResponse.json(
      {
        error: `This exact file was already uploaded on ${existingBatch.createdAt.toLocaleString()} (as "${existingBatch.filename}"). Nothing was ingested.`,
      },
      { status: 409 }
    );
  }

  const closedPeriods = await getClosedPeriodsAmong(companyId, parsed.map((txn) => periodFromDate(txn.date)));
  if (closedPeriods.length > 0) {
    return NextResponse.json(
      {
        error: `This file has transactions dated in a closed period (${closedPeriods.join(", ")}). Reopen the period before uploading, or remove those rows.`,
      },
      { status: 423 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const batch = await tx.uploadBatch.create({
      data: {
        source: "bank",
        filename: file.name,
        contentHash,
        rowCount: parsed.length,
        companyId,
      },
    });

    await tx.bankTransaction.createMany({
      data: parsed.map((txn) => ({
        accountId: txn.accountId,
        date: txn.date,
        amountCents: txn.amountCents,
        memo: txn.memo,
        sourceFormat: txn.sourceFormat,
        uploadBatchId: batch.id,
        companyId,
      })),
    });
  });

  const exactMatches = await runExactMatchPass(companyId);
  const fuzzyMatches = await runFuzzyMatchPass(companyId);
  const positivePay = await runPositivePayPass(companyId);
  const anomalies = await detectAnomalies(companyId);

  return NextResponse.json({
    ingested: parsed.length,
    exactMatches,
    fuzzyMatches,
    positivePay,
    anomalies,
  });
}