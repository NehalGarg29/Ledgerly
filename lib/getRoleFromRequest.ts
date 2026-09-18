import { NextRequest } from "next/server";
import { verifySessionToken } from "./session";

export type Role = "admin" | "analyst" | "viewer";

export function getRoleFromRequest(request: NextRequest): Role {
  const token = request.cookies.get("session")?.value;
  const payload = verifySessionToken(token);
  return payload?.role ?? "viewer"; // no valid session = least privilege, not open
}

export function getUserIdFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get("session")?.value;
  const payload = verifySessionToken(token);
  return payload?.userId ?? null;
}
