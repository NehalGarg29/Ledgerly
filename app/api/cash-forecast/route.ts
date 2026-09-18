import { NextResponse } from "next/server";
import { getCashForecast } from "../../../lib/cashForecast";

export async function GET() {
  const forecast = await getCashForecast();
  return NextResponse.json(forecast);
}
