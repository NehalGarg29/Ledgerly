import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "../../../lib/prisma";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";
import { parseGlCsvString } from "../../../lib/adapters/glAdapter";
import { runExactMatchPass, runFuzzyMatchPass } from "../../../lib/matchEngine";
import { periodFromDate, getClosedPeriodsAmong } from "../../../lib/closePeriod";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode") === "preview" ? "preview" : "commit";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const content = await file.text();
  const contentHash = createHash("sha256").update(content).digest("hex");

  let parsed;
  try {
    parsed = parseGlCsvString(content);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse GL CSV: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 400 }
    );
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No GL entries found in file" }, { status: 400 });
  }

  if (mode === "preview") {
    return NextResponse.json({ preview: parsed });
  }

  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot create GL entries" }, { status: 403 });
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

  const closedPeriods = await getClosedPeriodsAmong(companyId, parsed.map((entry) => periodFromDate(entry.date)));
  if (closedPeriods.length > 0) {
    return NextResponse.json(
      {
        error: `This file has GL entries dated in a closed period (${closedPeriods.join(", ")}). Reopen the period before uploading, or remove those rows.`,
      },
      { status: 423 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const batch = await tx.uploadBatch.create({
      data: {
        source: "gl",
        filename: file.name,
        contentHash,
        rowCount: parsed.length,
        companyId,
      },
    });

    await tx.gLEntry.createMany({
      data: parsed.map((entry) => ({
        fundId: entry.fundId,
        accountCode: entry.accountCode,
        amountCents: entry.amountCents,
        date: entry.date,
        description: entry.description,
        uploadBatchId: batch.id,
        companyId,
      })),
    });
  });

  const exactMatches = await runExactMatchPass(companyId);
  const fuzzyMatches = await runFuzzyMatchPass(companyId);

  return NextResponse.json({
    ingested: parsed.length,
    exactMatches,
    fuzzyMatches,
  });
}