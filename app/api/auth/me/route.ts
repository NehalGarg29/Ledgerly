import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const payload = verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: { email: payload.email, role: payload.role } });
}
