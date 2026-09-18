import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const exceptions = await prisma.positivePayException.findMany({
    where: { status: "pending" },
    include: { bankTransaction: true, issuedCheck: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ exceptions });
}
