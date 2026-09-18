import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { createSessionToken } from "../../../../lib/session";
import { generateInviteCode } from "../../../../lib/inviteCode";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; inviteCode?: string; companyName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const { password } = body;
  const inviteCode = body.inviteCode?.trim().toUpperCase() || undefined;
  const companyName = body.companyName?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  // Joining an existing company via invite code: least privilege, same as
  // before — an existing admin can promote them later. Starting fresh with
  // no invite code: there's no one else in the new company yet, so being
  // stuck as a viewer would leave nobody able to configure it. You become
  // that company's admin.
  let companyId: string;
  let role: "admin" | "analyst" | "viewer";

  if (inviteCode) {
    const company = await prisma.company.findUnique({ where: { inviteCode } });
    if (!company) {
      return NextResponse.json({ error: "That invite code doesn't match any company" }, { status: 400 });
    }
    companyId = company.id;
    role = "viewer";
  } else {
    const company = await prisma.company.create({
      data: {
        name: companyName || `${email.split("@")[0]}'s Company`,
        inviteCode: generateInviteCode(),
      },
    });
    companyId = company.id;
    role = "admin";
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, role, companyId },
  });

  const token = createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role as "admin" | "analyst" | "viewer",
    companyId: user.companyId,
    exp: Date.now() + SESSION_DURATION_MS,
  });

  const response = NextResponse.json({ email: user.email, role: user.role });
  response.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
  return response;
}
