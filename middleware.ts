import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token || !verifyAccessToken(token)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/case/:path*",
    "/api/cases/:path*",
    "/api/files/:path*",
    "/api/orchestration/:path*",
    "/api/generate/:path*",
    "/api/soc_analysis/:path*",
    "/api/storage/:path*",
    "/api/ocrText/:path*",
    "/api/save/:path*",
    "/api/analyze-pdf/:path*",
    "/api/analyze-pdf-split/:path*",
  ],
};
