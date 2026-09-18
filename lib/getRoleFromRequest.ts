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

// The company (tenant) the current session belongs to. Every data query in
// the app should be scoped by this — never trust a client-supplied id for
// which company's data to read or write.
export function getCompanyIdFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get("session")?.value;
  const payload = verifySessionToken(token);
  return payload?.companyId ?? null;
}
