import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const flags = await prisma.anomalyFlag.findMany({
    where: { status: "pending" },
    include: { bankTransaction: true },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ flags });
}
