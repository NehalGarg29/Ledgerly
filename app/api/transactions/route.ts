import { NextResponse } from "next/server";
import { getAllTransactions } from "../../../lib/getAllTransactions";

export async function GET() {
  const { transactions } = await getAllTransactions();
  return NextResponse.json({ transactions });
}