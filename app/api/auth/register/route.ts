import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { createSessionToken } from "../../../../lib/session";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const { password } = body;

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

  const passwordHash = await bcrypt.hash(password, 10);

  // New self-registered accounts start as viewers (least privilege). An
  // admin can promote them later — there's no self-serve path to admin.
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "viewer" },
  });

  const token = createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role as "admin" | "analyst" | "viewer",
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
