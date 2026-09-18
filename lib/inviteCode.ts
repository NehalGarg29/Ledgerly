import { randomBytes } from "crypto";

// Short, shareable code a company admin can hand to teammates so they land
// in the same company on registration instead of creating their own.
// Not a secret in the security sense (it only grants "viewer" access to a
// fresh company member), so plain hex is fine — no need for crypto-grade
// unguessability here.
export function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
