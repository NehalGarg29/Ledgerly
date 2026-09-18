import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "./session";

// Convenience for React Server Components, which read cookies via
// next/headers rather than a NextRequest (that's what
// lib/getRoleFromRequest.ts is for, in API routes).
export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get("session")?.value);
}
