import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";
import { generateInviteCode } from "../../../lib/inviteCode";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  return NextResponse.json({ company: { name: company.name, inviteCode: company.inviteCode } });
}

// Regenerates the invite code — invalidates the old one immediately (anyone
// holding it can no longer use it to join). Admin-only since it affects who
// can get into the company.
export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can regenerate the invite code." }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data: { inviteCode: generateInviteCode() },
  });

  return NextResponse.json({ company: { name: company.name, inviteCode: company.inviteCode } });
}
