import { NextRequest, NextResponse } from "next/server";
import { rotateRefreshToken, signAccessToken } from "@/lib/auth/tokens";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  cookieOptions,
} from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!raw) return NextResponse.json({ error: "no refresh token" }, { status: 401 });

  const rotated = await rotateRefreshToken(raw);
  if (!rotated) {
    const res = NextResponse.json({ error: "refresh failed" }, { status: 401 });
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  const access = signAccessToken(rotated.userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(REFRESH_COOKIE, rotated.token, cookieOptions(REFRESH_MAX_AGE));
  return res;
}
