import { NextResponse } from "next/server";
import { getAnalyticsStats } from "../../../lib/analyticsStats";

export async function GET() {
  const stats = await getAnalyticsStats();
  return NextResponse.json(stats);
}