import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";

// Browsable fallback for manual matching: when the proximity-based candidate
// search on a transaction finds nothing close, a human can search or browse
// the full pool of unmatched GL entries themselves — they may know things
// (a typo'd amount, a late posting, a reclass) that a distance search can't.
export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const entries = await prisma.gLEntry.findMany({
    where: {
      companyId,
      matches: { none: {} },
      ...(q
        ? {
            OR: [
              { description: { contains: q, mode: "insensitive" } },
              { accountCode: { contains: q, mode: "insensitive" } },
              { fundId: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json({ entries });
}
