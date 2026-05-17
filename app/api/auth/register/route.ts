import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, mintRefreshToken } from "@/lib/auth/tokens";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  cookieOptions,
} from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "email and password (>=8 chars) required" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "email already registered" }, { status: 409 });

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), name: name ?? null },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const access = signAccessToken(user.id);
  const refresh = await mintRefreshToken(user.id);

  const res = NextResponse.json({ user });
  res.cookies.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(REFRESH_COOKIE, refresh, cookieOptions(REFRESH_MAX_AGE));
  return res;
}
