import { NextRequest } from "next/server";

export type Role = "admin" | "analyst" | "viewer";

export function getRoleFromRequest(request: NextRequest): Role {
  const value = request.cookies.get("role")?.value;
  if (value === "admin" || value === "analyst" || value === "viewer") {
    return value;
  }
  return "viewer"; // no cookie = least privilege, not open
}