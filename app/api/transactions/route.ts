import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions } from "../../../lib/getAllTransactions";
import { getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { transactions } = await getAllTransactions({ companyId });
  return NextResponse.json({ transactions });
}