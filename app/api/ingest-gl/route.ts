import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getRoleFromRequest } from "../../../lib/getRoleFromRequest";
import { parseGlCsvString } from "../../../lib/adapters/glAdapter";
import { runExactMatchPass, runFuzzyMatchPass } from "../../../lib/matchEngine";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode") === "preview" ? "preview" : "commit";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const content = await file.text();

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
    return NextResponse.json({ error: "Viewers cannot upload files" }, { status: 403 });
  }

  await prisma.gLEntry.createMany({
    data: parsed.map((entry) => ({
      fundId: entry.fundId,
      accountCode: entry.accountCode,
      amountCents: entry.amountCents,
      date: entry.date,
      description: entry.description,
    })),
  });

  const exactMatches = await runExactMatchPass();
  const fuzzyMatches = await runFuzzyMatchPass();

  return NextResponse.json({
    ingested: parsed.length,
    exactMatches,
    fuzzyMatches,
  });
}